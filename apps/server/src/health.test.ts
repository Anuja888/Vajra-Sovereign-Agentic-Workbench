import { describe, it, expect } from 'vitest';
import app from './index';

describe('GET /health', () => {
  it('returns ok with version and mode', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.version).toBeTruthy();
    expect(body.mode).toBeDefined();
  });
});

describe('GET /api/network/stats', () => {
  it('returns network statistics with expected shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/network/stats' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(typeof body.externalBytes).toBe('number');
    expect(typeof body.blocked).toBe('number');
    expect(typeof body.local).toBe('number');
    expect(Array.isArray(body.perSecond)).toBe(true);
  });
});

describe('POST /api/redteam/attempt', () => {
  it('blocks a DNS exfiltration attempt', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/redteam/attempt',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'dns' }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.blocked).toBe(true);
    expect(body.reason).toBeTruthy();
  });

  it('blocks a fetch exfiltration attempt', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/redteam/attempt',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'fetch' }),
    });
    const body = JSON.parse(res.body);
    expect(body.blocked).toBe(true);
  });
});

describe('POST /api/audit/verify', () => {
  it('returns ok when chain is valid', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/audit/verify' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
  });
});

describe('GET /api/models', () => {
  it('returns an array of model manifests with health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/models' });
    expect(res.statusCode).toBe(200);
    const models = JSON.parse(res.body);
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    for (const m of models) {
      expect(m.id).toBeTruthy();
      expect(m.displayName).toBeTruthy();
      expect(m.health).toBeDefined();
    }
  });
});

describe('POST /api/calc/eval', () => {
  it('calculates ASME B31.3 minimum thickness', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/calc/eval',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'asme_b313_tmin',
        inputs: {
          P: { value: 2.4, unit: 'MPa' },
          D: { value: 168.3, unit: 'mm' },
          S: { value: 137.9, unit: 'MPa' }, // A106 Gr B allowable at 180°C
          E: { value: 1.0, unit: '-' },
          W: { value: 1.0, unit: '-' },
          Y: { value: 0.4, unit: '-' },
        },
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.result).toBeCloseTo(1.45, 1);
    expect(body.steps.length).toBeGreaterThan(0);
    expect(body.standard).toContain('ASME B31.3');
  });

  it('calculates corrosion rate', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/calc/eval',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'corrosion_rate',
        inputs: { t1: { value: 5.20, unit: 'mm' }, t2: { value: 4.35, unit: 'mm' }, years: { value: 3, unit: 'yr' } },
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.result).toBeCloseTo(0.283, 2);
    expect(body.resultUnit).toBe('mm/yr');
  });

  it('calculates remaining life', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/calc/eval',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'remaining_life',
        inputs: { t_current: { value: 4.35, unit: 'mm' }, t_required: { value: 1.45, unit: 'mm' }, cr: { value: 0.28, unit: 'mm/yr' } },
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.result).toBeCloseTo(10.36, 0);
    expect(body.resultUnit).toBe('yr');
  });

  it('calculates LMTD', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/calc/eval',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'lmtd',
        inputs: {
          T1_in: { value: 120, unit: '°C' }, T1_out: { value: 80, unit: '°C' },
          T2_in: { value: 30, unit: '°C' }, T2_out: { value: 60, unit: '°C' },
        },
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.result).toBeGreaterThan(0);
    expect(body.resultUnit).toBe('°C');
  });
});

describe('POST /api/runs', () => {
  it('creates a run with steps', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/runs',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ goal: 'Read inspection report and draft approval note for corrosion check', classification: 'confidential' }),
    });
    expect(res.statusCode).toBe(200);
    const run = JSON.parse(res.body);
    expect(run.id).toBeTruthy();
    expect(run.status).toBe('running');
    expect(Array.isArray(run.steps)).toBe(true);
    expect(run.steps.length).toBeGreaterThan(0);
  });
});

describe('POST /api/models/route', () => {
  it('routes a coding task', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/models/route',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ goal: 'Write a Python function to compute LMTD', stepId: 'test-step' }),
    });
    expect(res.statusCode).toBe(200);
    const decision = JSON.parse(res.body);
    expect(decision.selectedModel).toBeTruthy();
    expect(decision.decisionReason).toBeTruthy();
    expect(Array.isArray(decision.scores)).toBe(true);
  });
});
