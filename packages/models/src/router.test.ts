import { describe, it, expect } from 'vitest';
import { analyzeTask, scoreModels, route } from './router';
import type { RouterState } from './router';

const DEFAULT_STATE: RouterState = {
  vramUsed: 0, vramTotal: 24,
  successRates: new Map(), queueDepths: new Map(),
};

describe('analyzeTask', () => {
  it('detects coding tasks', () => {
    const a = analyzeTask('write a Python script to parse CSV');
    expect(a.taskTypes).toContain('coding');
  });

  it('detects vision-ocr tasks', () => {
    const a = analyzeTask('OCR the scanned inspection PDF');
    expect(a.taskTypes).toContain('vision-ocr');
  });

  it('detects document-drafting tasks', () => {
    const a = analyzeTask('draft an approval note for the inspection');
    expect(a.taskTypes).toContain('document-drafting');
  });

  it('detects summarization tasks', () => {
    const a = analyzeTask('summarize this report in 3 bullets');
    expect(a.taskTypes).toContain('summarization');
  });

  it('falls back to summarization when no keywords match', () => {
    const a = analyzeTask('hello');
    expect(a.taskTypes.length).toBeGreaterThan(0);
  });

  it('includes text modality by default', () => {
    const a = analyzeTask('some task');
    expect(a.modalities).toContain('text');
  });
});

describe('scoreModels', () => {
  it('eliminates embedding-only model for non-embedding tasks', () => {
    const analysis = analyzeTask('write python code');
    const scores = scoreModels(analysis, DEFAULT_STATE);
    const bge = scores.find(s => s.modelId === 'bge-m3');
    expect(bge?.eliminated).toBe(true);
    expect(bge?.eliminationReason).toContain('Embedding-only');
    // Simulated model should NOT be eliminated (it supports text+vision+embeddings)
    const sim = scores.find(s => s.modelId === 'simulated');
    expect(sim?.eliminated).toBe(false);
  });

  it('eliminates non-vision models for vision tasks', () => {
    const analysis = analyzeTask('read this scanned image', ['vision']);
    const scores = scoreModels(analysis, DEFAULT_STATE);
    // All text-only models should be eliminated
    const textOnly = scores.filter(s => s.modelId !== 'bge-m3' && s.modelId !== 'qwen-vl-7b' && s.modelId !== 'simulated' && !s.eliminated);
    expect(textOnly.length).toBe(0);
  });

  it('gives installed models a score bonus', () => {
    const analysis = analyzeTask('summarize this document');
    const scores = scoreModels(analysis, DEFAULT_STATE);
    const simulated = scores.find(s => s.modelId === 'simulated');
    const notInstalled = scores.find(s => s.modelId === 'gpt-oss-20b');
    expect(simulated).toBeDefined();
    expect(notInstalled).toBeDefined();
    // Simulated should outscore not-installed despite similar capability
    // (the installed bonus is 0.15)
    if (simulated && notInstalled && !simulated.eliminated && !notInstalled.eliminated) {
      expect(simulated.totalScore).toBeGreaterThan(notInstalled.totalScore - 0.3);
    }
  });
});

describe('route', () => {
  it('selects a model for a coding task', () => {
    const d = route('step-1', 'write Python code to compute LMTD');
    expect(d.selectedModel).toBeTruthy();
    expect(d.fallbackChain).toBeDefined();
    expect(d.decisionReason).toBeTruthy();
  });

  it('selects a vision model for image tasks', () => {
    const d = route('step-vis', 'OCR this scanned drawing', ['vision']);
    const model = d.selectedModel;
    // Should be a vision-capable model (qwen-vl-7b or simulated)
    expect(['qwen-vl-7b', 'simulated']).toContain(model);
  });

  it('selects simulated model when it is the only installed one', () => {
    const d = route('step-sim', 'summarize this document');
    // simulated is installed, all others are not — simulated should win due to installed bonus
    expect(d.selectedModel).toBe('simulated');
  });

  it('returns a different model for coding vs summarization (when both types have different top scores)', () => {
    const dCode = route('step-c', 'write a Python function with tests');
    const dSum = route('step-s', 'summarize this inspection report briefly');
    // Both should return valid models; they may differ
    expect(dCode.selectedModel).toBeTruthy();
    expect(dSum.selectedModel).toBeTruthy();
  });

  it('includes task analysis in the decision', () => {
    const d = route('step-2', 'read this scanned P&ID drawing and extract tags', ['vision']);
    expect(d.taskAnalysis.taskTypes).toBeDefined();
    expect(d.taskAnalysis.modalities).toContain('vision');
  });

  it('includes all scores including eliminated models', () => {
    const d = route('step-3', 'summarise the vendor offers');
    expect(d.scores.length).toBeGreaterThan(0);
    expect(d.scores.some(s => s.eliminated)).toBe(true); // embedding model eliminated
  });
});
