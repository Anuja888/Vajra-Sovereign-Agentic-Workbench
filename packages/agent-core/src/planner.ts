// VAJRA Agent Core — Planner, Executor, Critic, Specialists
// All data is SYNTHETIC and fictional
import type { PlanStep, AgentRole, StepStatus } from '@vajra/shared';
import { randomUUID } from 'node:crypto';

// ── Planner ───────────────────────────────────────────────────────────────────

interface PlanInput {
  goal: string;
  attachments?: string[];
  context?: string;
}

export function planTask(input: PlanInput): PlanStep[] {
  const { goal, attachments = [] } = input;
  const lower = goal.toLowerCase();
  const hasImage = attachments.some(a => /\.(pdf|png|jpg|jpeg|tiff)$/i.test(a));
  const hasExcel = attachments.some(a => /\.(xlsx|csv)$/i.test(a));

  const steps: PlanStep[] = [];

  // S1: Scan-to-Approval flow
  if (lower.match(/inspect|scan|ocr|ut report|thickness|approval note|corrosion/)) {
    steps.push(...buildInspectionPlan(hasImage));
  }
  // S2: Coding flow  
  else if (lower.match(/code|python|script|function|test|lmtd|exchanger/)) {
    steps.push(...buildCodingPlan());
  }
  // S3: Drawing review
  else if (lower.match(/p&id|drawing|pid|instrument|tag|discrepancy/)) {
    steps.push(...buildDrawingPlan());
  }
  // S4: Board deck from Excel
  else if (lower.match(/deck|presentation|pptx|slide|board|inventory/) && hasExcel) {
    steps.push(...buildDeckPlan());
  }
  // S5: Vendor comparison
  else if (lower.match(/vendor|comparison|tender|compare.*offer/)) {
    steps.push(...buildVendorPlan());
  }
  // Generic: KB + draft
  else {
    steps.push(...buildGenericPlan(goal));
  }

  return steps;
}

function buildInspectionPlan(hasImage: boolean): PlanStep[] {
  const s1 = id(); const s2 = id(); const s3 = id();
  const s4 = id(); const s5 = id(); const s6 = id(); const s7 = id();
  return [
    mkStep(s1, 'Extract text and measurements from scanned inspection report via OCR/VLM', 'vision_analyst', 'ocr.read', [], ['Measurements extracted', 'TML readings identified']),
    mkStep(s2, 'Retrieve SOP-INS-014 and line CDU-OH-114 datasheet from knowledge base', 'researcher', 'kb.search', [s1], ['SOP threshold found', 'Line datasheet retrieved']),
    mkStep(s3, 'Calculate minimum required wall thickness per ASME B31.3 §304.1.2', 'analyst', 'calc.eval', [s1, s2], ['t_req calculated', 'Corrosion rate computed', 'Remaining life estimated']),
    mkStep(s4, 'Cross-check OCR readings against 2023 survey data and flag anomalies', 'analyst', 'kb.search', [s1, s2], ['Anomalies identified', 'Low-confidence readings flagged']),
    mkStep(s5, 'Draft approval note with findings, calculations, and recommendations', 'author', 'docx.generate', [s2, s3, s4], ['Approval note drafted', 'All calculations referenced', 'Recommendations included']),
    mkStep(s6, 'Critic: verify all numbers consistent, citations present, no hallucinations', 'critic', undefined, [s5], ['Numbers match calc store', 'All claims cited', 'No inconsistencies']),
    mkStep(s7, 'Request approval and prepare download package', 'planner', undefined, [s6], ['Approval requested', 'Artifact ready for download']),
  ];
}

function buildCodingPlan(): PlanStep[] {
  const s1 = id(); const s2 = id(); const s3 = id(); const s4 = id();
  return [
    mkStep(s1, 'Analyze requirements and write Python implementation with type hints', 'coder', 'code.run', [], ['Code written', 'No syntax errors']),
    mkStep(s2, 'Write pytest test suite covering edge cases and typical inputs', 'coder', 'code.test', [s1], ['Tests written']),
    mkStep(s3, 'Run tests in sandbox, iterate on failures until all green', 'coder', 'code.test', [s2], ['All tests pass', 'No sandbox escapes']),
    mkStep(s4, 'Package code + tests with README and export artifact', 'author', 'docx.generate', [s3], ['Script exported', 'Tests passing']),
  ];
}

function buildDrawingPlan(): PlanStep[] {
  const s1 = id(); const s2 = id(); const s3 = id(); const s4 = id();
  return [
    mkStep(s1, 'Extract instrument/equipment tags from P&ID image with bounding boxes', 'vision_analyst', 'drawing.extract_tags', [], ['Tags extracted', 'Bounding boxes set']),
    mkStep(s2, 'Look up each tag in equipment datasheets from knowledge base', 'researcher', 'kb.search', [s1], ['Datasheets retrieved']),
    mkStep(s3, 'Identify discrepancies between drawing values and datasheet specifications', 'analyst', undefined, [s1, s2], ['Discrepancies listed', 'Severity assessed']),
    mkStep(s4, 'Draft RFI (Request for Information) document with discrepancy table', 'author', 'docx.generate', [s3], ['RFI drafted', 'All discrepancies documented']),
  ];
}

function buildDeckPlan(): PlanStep[] {
  const s1 = id(); const s2 = id(); const s3 = id(); const s4 = id(); const s5 = id();
  return [
    mkStep(s1, 'Parse tank inventory XLSX and compute key metrics (variance, days of cover)', 'analyst', 'sheet.read', [], ['Data loaded', 'Formulas computed']),
    mkStep(s2, 'Generate trend charts and risk matrix from the inventory data', 'analyst', 'report.chart', [s1], ['Charts generated']),
    mkStep(s3, 'Search knowledge base for context: contracts, specs, prior board notes', 'researcher', 'kb.search', [s1], ['Context retrieved']),
    mkStep(s4, 'Redact vendor prices for external distribution copy', 'analyst', 'redact.scan', [s1, s3], ['Prices redacted', 'Review tokens stored']),
    mkStep(s5, 'Generate 7-slide PowerPoint with speaker notes, charts embedded', 'author', 'pptx.generate', [s1, s2, s3], ['PPTX generated', 'Charts embedded', 'Speaker notes complete']),
  ];
}

function buildVendorPlan(): PlanStep[] {
  const s1 = id(); const s2 = id(); const s3 = id(); const s4 = id();
  return [
    mkStep(s1, 'Extract offer details from vendor documents', 'vision_analyst', 'pdf.extract', [], ['Vendor data extracted']),
    mkStep(s2, 'Retrieve tender specification and evaluation criteria from KB', 'researcher', 'kb.search', [s1], ['Spec retrieved', 'Criteria identified']),
    mkStep(s3, 'Build comparison matrix with deviation flags and conditional formatting', 'analyst', 'sheet.write', [s1, s2], ['Comparison matrix built']),
    mkStep(s4, 'Redact sensitive pricing, generate summary report', 'author', 'redact.scan', [s3], ['Report generated', 'Prices redacted']),
  ];
}

function buildGenericPlan(goal: string): PlanStep[] {
  const s1 = id(); const s2 = id();
  return [
    mkStep(s1, `Research: retrieve relevant documents and facts for "${goal.substring(0, 60)}"`, 'researcher', 'kb.search', [], ['Sources found']),
    mkStep(s2, 'Draft response with citations from knowledge base', 'author', 'docx.generate', [s1], ['Draft complete', 'Citations included']),
  ];
}

function id() { return randomUUID().split('-')[0]; }

function mkStep(id: string, goal: string, agent: AgentRole, tool: string | undefined, dependsOn: string[], successCriteria: string[]): PlanStep {
  return { id, goal, agent, tool, inputs: {}, dependsOn, successCriteria, status: 'pending' as StepStatus };
}

// ── Critic ────────────────────────────────────────────────────────────────────
export interface CriticCheck {
  passed: boolean;
  issues: string[];
}

export function criticCheck(draft: string, calcIds: string[]): CriticCheck {
  const issues: string[] = [];
  if (!draft.includes('CDU-OH') && !draft.includes('Finding') && draft.length < 100)
    issues.push('Document appears incomplete — missing key sections');
  if (calcIds.length === 0)
    issues.push('No calculations referenced — author must cite calculation store');
  return { passed: issues.length === 0, issues };
}
