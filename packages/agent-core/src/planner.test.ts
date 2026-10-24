import { describe, it, expect } from 'vitest';
import { planTask, criticCheck } from './planner';

describe('planTask', () => {
  it('creates an inspection plan for scan/OCR goals', () => {
    const steps = planTask({ goal: 'Read scanned UT inspection report and draft approval note for corrosion check' });
    expect(steps.length).toBeGreaterThanOrEqual(5);
    const agents = steps.map(s => s.agent);
    expect(agents).toContain('vision_analyst');
    expect(agents).toContain('analyst');
    expect(agents).toContain('author');
    expect(agents).toContain('critic');
  });

  it('creates a coding plan for Python/script goals', () => {
    const steps = planTask({ goal: 'Write a Python script to compute LMTD with pytest tests' });
    expect(steps.length).toBeGreaterThanOrEqual(3);
    const agents = steps.map(s => s.agent);
    expect(agents).toContain('coder');
  });

  it('creates a drawing plan for P&ID goals', () => {
    const steps = planTask({ goal: 'Review P&ID drawing and find instrument tag discrepancies' });
    expect(steps.length).toBeGreaterThanOrEqual(3);
    const agents = steps.map(s => s.agent);
    expect(agents).toContain('vision_analyst');
    expect(agents).toContain('researcher');
  });

  it('creates a deck plan for board presentation goals', () => {
    const steps = planTask({ goal: 'Create board deck from inventory XLSX', attachments: ['inventory.xlsx'] });
    expect(steps.length).toBeGreaterThanOrEqual(4);
    const agents = steps.map(s => s.agent);
    expect(agents).toContain('author');
  });

  it('returns steps with required fields', () => {
    const steps = planTask({ goal: 'Generic task' });
    for (const step of steps) {
      expect(step.id).toBeTruthy();
      expect(step.goal).toBeTruthy();
      expect(step.agent).toBeTruthy();
      expect(step.status).toBe('pending');
      expect(Array.isArray(step.dependsOn)).toBe(true);
      expect(Array.isArray(step.successCriteria)).toBe(true);
    }
  });

  it('builds dependsOn chains for inspection plan', () => {
    const steps = planTask({ goal: 'scan OCR inspection approval' });
    // Later steps should have dependsOn entries
    const withDeps = steps.filter(s => s.dependsOn.length > 0);
    expect(withDeps.length).toBeGreaterThan(0);
  });
});

describe('criticCheck', () => {
  it('passes for a complete document with calcIds', () => {
    const result = criticCheck(
      'CDU-OH-114 Approval Note\nFinding: TML-3 below threshold',
      ['asme-b313-tmin']
    );
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('fails when no calculations referenced', () => {
    const result = criticCheck(
      'CDU-OH-114 Approval Note\nFinding: TML-3 below threshold',
      []
    );
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('calculation'))).toBe(true);
  });

  it('fails for an incomplete/short document', () => {
    const result = criticCheck('short', []);
    expect(result.passed).toBe(false);
  });
});
