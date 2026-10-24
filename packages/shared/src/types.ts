// VAJRA Shared Types — all contracts between server and web
// SYNTHETIC DATA — all identifiers, names, and data are fictional

export type ModelId = string;
export type RunId = string;
export type StepId = string;
export type ToolId = string;
export type DocId = string;
export type ChunkId = string;

// ── Model Registry ──────────────────────────────────────────────────────────
export type Modality = 'text' | 'vision' | 'audio' | 'embeddings';
export type ProviderType = 'ollama' | 'vllm' | 'llamacpp' | 'simulated';

export interface ModelStrengths {
  reasoning: number;
  coding: number;
  summarization: number;
  documentDrafting: number;
  visionOcr: number;
  drawingUnderstanding: number;
  tabular: number;
  multilingual: number;
}

export interface ModelManifest {
  id: ModelId;
  displayName: string;
  family: string;
  params: string; // e.g. "70B"
  quantization: string; // e.g. "Q4_K_M"
  contextWindow: number;
  modalities: Modality[];
  strengths: ModelStrengths;
  vramGb: number;
  tokensPerSec: number;
  license: string;
  endpoint: string;
  provider: ProviderType;
  installed: boolean;
  pullCommand?: string;
  description: string;
}

export interface ModelHealth {
  id: ModelId;
  ok: boolean;
  latencyMs: number;
  tokensPerSec: number;
  vramUsedGb: number;
  queueDepth: number;
  error?: string;
}

// ── Router ───────────────────────────────────────────────────────────────────
export interface TaskAnalysis {
  taskTypes: string[];
  modalities: Modality[];
  requiredContextLength: number;
  toolNeeds: string[];
  latencyPreference: 'fast' | 'balanced' | 'quality';
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface ModelScore {
  modelId: ModelId;
  totalScore: number;
  capabilityScore: number;
  liveSuccessRate: number;
  modalityFit: number;
  latencyCost: number;
  vramPressure: number;
  queueDepth: number;
  explanation: string;
  eliminated: boolean;
  eliminationReason?: string;
}

export interface RouterDecision {
  stepId: StepId;
  selectedModel: ModelId;
  fallbackChain: ModelId[];
  taskAnalysis: TaskAnalysis;
  scores: ModelScore[];
  decisionReason: string;
  routedAt: number;
}

// ── Agent Runtime ─────────────────────────────────────────────────────────────
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'awaiting_approval' | 'skipped';
export type AgentRole = 'planner' | 'researcher' | 'vision_analyst' | 'analyst' | 'coder' | 'author' | 'critic';
export type ClassificationLevel = 'public' | 'internal' | 'confidential' | 'restricted';

export interface PlanStep {
  id: StepId;
  goal: string;
  agent: AgentRole;
  tool?: string;
  inputs: Record<string, unknown>;
  dependsOn: StepId[];
  successCriteria: string[];
  status: StepStatus;
  modelId?: ModelId;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  outputSummary?: string;
}

export interface Fact {
  id: string;
  claim: string;
  value: string | number;
  unit?: string;
  confidence: number; // 0-1
  source: FactSource;
  addedAt: number;
}

export interface FactSource {
  type: 'ocr' | 'vlm' | 'kb' | 'calculation' | 'tool' | 'user';
  docId?: DocId;
  page?: number;
  bbox?: BBox;
  chunkId?: ChunkId;
  calcId?: string;
  text?: string;
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: BBox;
}

// ── Run ───────────────────────────────────────────────────────────────────────
export type RunStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface Run {
  id: RunId;
  title: string;
  goal: string;
  status: RunStatus;
  classification: ClassificationLevel;
  createdAt: number;
  updatedAt: number;
  steps: PlanStep[];
  facts: Fact[];
  artifacts: Artifact[];
  modelMode: 'live' | 'demo';
  tags: string[];
  pinned: boolean;
}

// ── Artifacts ─────────────────────────────────────────────────────────────────
export type ArtifactType = 'docx' | 'pptx' | 'xlsx' | 'py' | 'md' | 'pdf' | 'json' | 'zip';

export interface Artifact {
  id: string;
  runId: RunId;
  name: string;
  type: ArtifactType;
  sizeBytes: number;
  classification: ClassificationLevel;
  createdAt: number;
  path: string;
  version: number;
  description: string;
}

// ── Events (SSE stream) ───────────────────────────────────────────────────────
export type EventType =
  | 'plan.created'
  | 'step.started'
  | 'step.completed'
  | 'step.failed'
  | 'model.routed'
  | 'tool.called'
  | 'tool.result'
  | 'fact.added'
  | 'approval.requested'
  | 'approval.resolved'
  | 'critic.failed'
  | 'critic.passed'
  | 'artifact.created'
  | 'net.event'
  | 'run.completed'
  | 'run.failed'
  | 'ocr.word'
  | 'injection.blocked';

export interface VajraEvent {
  id: string;
  type: EventType;
  runId?: RunId;
  ts: number;
  payload: unknown;
}

// ── Network Monitor ───────────────────────────────────────────────────────────
export type NetworkVerdict = 'BLOCKED' | 'LOCAL' | 'ALLOWED';

export interface NetworkEvent {
  id: string;
  ts: number;
  source: string;
  dest: string;
  protocol: string;
  verdict: NetworkVerdict;
  bytes: number;
  reason?: string;
}

export interface NetworkStats {
  externalBytes: number;
  blocked: number;
  local: number;
  perSecond: Array<{ t: number; v: number }>;
}

// ── Knowledge Base ────────────────────────────────────────────────────────────
export interface KbDocument {
  id: DocId;
  name: string;
  type: string;
  sizeBytes: number;
  pageCount: number;
  classification: ClassificationLevel;
  ingestStatus: 'pending' | 'processing' | 'indexed' | 'failed';
  ingestProgress: number; // 0-100
  ingestedAt?: number;
  collection: string;
  chunkCount: number;
}

export interface KbChunk {
  id: ChunkId;
  docId: DocId;
  docName: string;
  page: number;
  section: string;
  text: string;
  score: number;
  bbox?: BBox;
  classification: ClassificationLevel;
}

export interface KbSearchResult {
  chunks: KbChunk[];
  totalFound: number;
  queryEmbedModel: string;
  retrievalMode: 'hybrid' | 'bm25' | 'vector';
}

// ── Calculations ──────────────────────────────────────────────────────────────
export interface CalcStep {
  label: string;
  latex: string;
  value?: number;
  unit?: string;
}

export interface CalcResult {
  id: string;
  name: string;
  inputs: Record<string, { value: number; unit: string }>;
  formula: string;
  steps: CalcStep[];
  result: number;
  resultUnit: string;
  warnings: string[];
  standard?: string;
}

// ── Approval ──────────────────────────────────────────────────────────────────
export type ApprovalAction = 'approve' | 'edit' | 'reject';

export interface ApprovalRequest {
  id: string;
  runId: RunId;
  stepId: StepId;
  action: string; // description of what's being approved
  classification: ClassificationLevel;
  preview: string; // rendered preview HTML
  requestedAt: number;
  resolvedAt?: number;
  resolution?: ApprovalAction;
  editedContent?: string;
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: number;
  ts: number;
  payload: unknown;
  prevHash: string;
  hash: string;
}

// ── Templates ─────────────────────────────────────────────────────────────────
export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  defaultGoal: string;
  suggestedFiles?: string[];
  outputTypes: ArtifactType[];
}
