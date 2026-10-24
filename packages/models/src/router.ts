// VAJRA Model Router — scores and selects the best model per step
import type { ModelManifest, ModelScore, RouterDecision, TaskAnalysis, StepId } from '@vajra/shared';
import { MODEL_MANIFESTS } from './manifests';

// Router weights
const W = {
  capability: 0.35,
  successRate: 0.25,
  modalityFit: 0.20,
  latencyCost: 0.10,
  vramPressure: 0.05,
  queueDepth: 0.05,
};

export interface RouterState {
  vramUsed: number; // GB
  vramTotal: number; // GB
  successRates: Map<string, number>; // modelId -> 0-1
  queueDepths: Map<string, number>; // modelId -> count
}

export function analyzeTask(goal: string, attachedModalities: string[] = []): TaskAnalysis {
  const lower = goal.toLowerCase();
  const taskTypes: string[] = [];
  
  if (lower.match(/code|python|script|function|class|debug|test|pytest/))
    taskTypes.push('coding');
  if (lower.match(/summar|brief|tldr|overview|abstract/))
    taskTypes.push('summarization');
  if (lower.match(/draw|p&id|diagram|sketch|blueprint|piping/))
    taskTypes.push('drawing-understanding');
  if (lower.match(/scan|ocr|handwrit|image|photo|picture|pdf|inspect/))
    taskTypes.push('vision-ocr');
  if (lower.match(/draft|note|memo|letter|report|document|word|approval/))
    taskTypes.push('document-drafting');
  if (lower.match(/calcul|formula|math|thickness|corrosion|asme|pressure|lmtd/))
    taskTypes.push('reasoning');
  if (lower.match(/table|excel|sheet|spreadsheet|csv|data/))
    taskTypes.push('tabular');
  if (lower.match(/kannada|hindi|translate|multilingual/))
    taskTypes.push('multilingual');
  
  if (taskTypes.length === 0) taskTypes.push('summarization');

  const modalities = [...attachedModalities] as any[];
  if (!modalities.includes('text')) modalities.unshift('text');

  return {
    taskTypes,
    modalities,
    requiredContextLength: lower.length > 500 ? 32768 : 8192,
    toolNeeds: [],
    latencyPreference: lower.match(/quick|fast|brief/) ? 'fast' : 'balanced',
    confidentialityLevel: 'confidential',
  };
}

export function scoreModels(
  analysis: TaskAnalysis,
  state: RouterState,
  models: ModelManifest[] = MODEL_MANIFESTS,
): ModelScore[] {
  return models.map((m) => {
    // Hard filters
    const needsVision = analysis.modalities.includes('vision' as any);
    if (needsVision && !m.modalities.includes('vision')) {
      return {
        modelId: m.id, totalScore: 0,
        capabilityScore: 0, liveSuccessRate: 0, modalityFit: 0,
        latencyCost: 0, vramPressure: 0, queueDepth: 0,
        explanation: 'Eliminated: no vision capability',
        eliminated: true, eliminationReason: 'Vision modality required',
      };
    }
    if (m.modalities.length === 1 && m.modalities.includes('embeddings' as any) && analysis.taskTypes[0] !== 'embedding') {
      return {
        modelId: m.id, totalScore: 0,
        capabilityScore: 0, liveSuccessRate: 0, modalityFit: 0,
        latencyCost: 0, vramPressure: 0, queueDepth: 0,
        explanation: 'Eliminated: embedding-only model',
        eliminated: true, eliminationReason: 'Embedding-only',
      };
    }

    // Capability score (0-1)
    const primaryTask = analysis.taskTypes[0];
    const capMap: Record<string, keyof typeof m.strengths> = {
      coding: 'coding',
      summarization: 'summarization',
      'document-drafting': 'documentDrafting',
      'vision-ocr': 'visionOcr',
      'drawing-understanding': 'drawingUnderstanding',
      reasoning: 'reasoning',
      tabular: 'tabular',
      multilingual: 'multilingual',
    };
    const strengthKey = capMap[primaryTask] ?? 'reasoning';
    const capabilityScore = m.strengths[strengthKey] / 100;

    const successRate = state.successRates.get(m.id) ?? 0.85;
    const modalityFit = needsVision && m.modalities.includes('vision') ? 1.0 : 0.8;
    const latencyCost = analysis.latencyPreference === 'fast' ? (100 - m.tokensPerSec) / 100 : 0.2;
    const vramPressure = state.vramUsed / Math.max(state.vramTotal, 1);
    const queueDepthNorm = (state.queueDepths.get(m.id) ?? 0) / 10;
    // Installed models get a significant bonus to ensure they are always preferred
    const installedBonus = m.installed ? 0.15 : 0;

    const total =
      W.capability * capabilityScore +
      W.successRate * successRate +
      W.modalityFit * modalityFit -
      W.latencyCost * latencyCost -
      W.vramPressure * vramPressure -
      W.queueDepth * queueDepthNorm +
      installedBonus;

    return {
      modelId: m.id,
      totalScore: Math.max(0, total),
      capabilityScore,
      liveSuccessRate: successRate,
      modalityFit,
      latencyCost,
      vramPressure,
      queueDepth: queueDepthNorm,
      explanation: `${m.displayName}: ${primaryTask} strength ${(capabilityScore * 100).toFixed(0)}/100, ${m.tokensPerSec} tok/s, ${m.vramGb}GB VRAM${m.installed ? ' [installed]' : ' [not installed]'}`,
      eliminated: false,
    };
  });
}

export function route(
  stepId: StepId,
  goal: string,
  attachedModalities: string[] = [],
  state: RouterState = { vramUsed: 0, vramTotal: 24, successRates: new Map(), queueDepths: new Map() },
): RouterDecision {
  const analysis = analyzeTask(goal, attachedModalities);
  const scores = scoreModels(analysis, state);
  const active = scores.filter(s => !s.eliminated).sort((a, b) => b.totalScore - a.totalScore);
  const top = active[0];

  return {
    stepId,
    selectedModel: top?.modelId ?? 'simulated',
    fallbackChain: active.slice(1, 4).map(s => s.modelId),
    taskAnalysis: analysis,
    scores,
    decisionReason: top
      ? `Selected ${MODEL_MANIFESTS.find(m => m.id === top.modelId)?.displayName} for ${analysis.taskTypes.join('+')} — highest composite score ${(top.totalScore * 100).toFixed(1)}/100`
      : 'Fallback to simulated provider',
    routedAt: Date.now(),
  };
}
