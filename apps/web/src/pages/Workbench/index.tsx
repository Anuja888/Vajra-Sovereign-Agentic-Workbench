import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send, Paperclip, Zap, FileText, Code2, BarChart2, BookOpen,
  ChevronRight, CheckCircle, Circle, Loader, Clock, AlertTriangle,
  Download, Eye, RefreshCw, XCircle, User, Bot, ChevronDown, Pin,
  X as XIcon,
} from 'lucide-react';
import type { Run, PlanStep, Fact, Artifact } from '@vajra/shared';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

// ── Task templates ─────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 't-scan',
    label: 'Scan-to-Approval',
    icon: FileText,
    color: 'var(--ok)',
    description: 'OCR a scanned inspection report → calculate remaining life → draft approval note',
    goal: 'Read scanned UT inspection report for line CDU-OH-114 (6in sch40, A106 Gr B, 2.4 MPa, 180°C). Extract TML readings, retrieve SOP-INS-014 threshold and line datasheet, calculate t_req by ASME B31.3, corrosion rate and remaining life. Flag TML-3 if below threshold. Draft approval note as Word document.',
  },
  {
    id: 't-code',
    label: 'Code + Sandbox',
    icon: Code2,
    color: 'var(--accent)',
    description: 'Write Python code with tests, run in sandbox, iterate until green',
    goal: 'Write a Python tool to compute LMTD and required heat transfer area for exchanger E-104 from a CSV of temperatures. Include pytest tests. Run in sandbox — fix any failures. Export script + tests.',
  },
  {
    id: 't-pid',
    label: 'P&ID Drawing Review',
    icon: Eye,
    color: 'var(--info)',
    description: 'Extract tags from P&ID, cross-check datasheets, flag discrepancies',
    goal: 'Review P&ID photo for CDU-OH section. Extract all instrument and equipment tags with bounding boxes. Cross-check each tag against datasheets in the knowledge base. Generate a discrepancy table and draft an RFI document.',
  },
  {
    id: 't-deck',
    label: 'Board Deck from Excel',
    icon: BarChart2,
    color: 'var(--warn)',
    description: 'Analyse inventory XLSX → charts → 7-slide PPTX with speaker notes',
    goal: 'Read tank farm inventory XLSX. Compute variance and days of cover for each product. Generate charts. Retrieve context from knowledge base. Create a 7-slide PowerPoint board presentation with speaker notes. Redact vendor prices for the external copy.',
  },
  {
    id: 't-kb',
    label: 'Knowledge Base Query',
    icon: BookOpen,
    color: 'var(--ink-dim)',
    description: 'Ask a question grounded in your internal documents',
    goal: 'What is the alert threshold for wall thickness on CDU overhead lines, and what does SOP-INS-014 say about escalation procedures for readings below the threshold?',
  },
];

// ── Step icon ──────────────────────────────────────────────────────────────
function StepIcon({ status }: { status: PlanStep['status'] }) {
  if (status === 'running') return <Loader size={14} className="animate-spin text-ok" />;
  if (status === 'completed') return <CheckCircle size={14} style={{ color: 'var(--accent)' }} />;
  if (status === 'failed') return <XCircle size={14} style={{ color: 'var(--danger)' }} />;
  if (status === 'awaiting_approval') return <AlertTriangle size={14} style={{ color: 'var(--warn)' }} />;
  return <Circle size={14} style={{ color: 'var(--ink-faint)' }} />;
}

const AGENT_COLORS: Record<string, string> = {
  planner: 'var(--ink-faint)',
  researcher: 'var(--ok)',
  vision_analyst: 'var(--info)',
  analyst: 'var(--accent)',
  coder: 'var(--accent)',
  author: 'var(--warn)',
  critic: 'var(--danger)',
};

const AGENT_LABELS: Record<string, string> = {
  planner: 'Planner',
  researcher: 'Researcher',
  vision_analyst: 'Vision Analyst',
  analyst: 'Analyst',
  coder: 'Coder',
  author: 'Author',
  critic: 'Critic',
};

// ── Approval Card ──────────────────────────────────────────────────────────
function ApprovalCard({ runId, onResolved }: { runId: string; onResolved: () => void }) {
  const qc = useQueryClient();
  const { data: approvals } = useQuery<any[]>({
    queryKey: ['approvals'],
    queryFn: async () => (await fetch(`${API}/api/approvals`)).json(),
    refetchInterval: 2000,
  });

  const pending = approvals?.find(a => a.runId === runId && !a.resolvedAt);

  const resolve = useMutation({
    mutationFn: async (resolution: string) => {
      await fetch(`${API}/api/approvals/${pending!.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['run', runId] });
      onResolved();
    },
  });

  if (!pending) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
      style={{ borderColor: 'var(--warn)', borderLeftWidth: 3 }}
    >
      <div className="card-header">
        <AlertTriangle size={14} style={{ color: 'var(--warn)' }} />
        <span className="font-semibold" style={{ color: 'var(--warn)' }}>Approval Required</span>
        <span className="chip chip-confidential ml-auto">Confidential</span>
      </div>
      <div className="card-body">
        <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 12 }}>{pending.action}</p>
        <div
          className="rounded-lg overflow-auto mb-4"
          style={{ maxHeight: 320, background: 'var(--surface-2)', border: '1px solid var(--line)', padding: 16 }}
          dangerouslySetInnerHTML={{ __html: pending.preview }}
        />
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => resolve.mutate('approve')} disabled={resolve.isPending}>
            <CheckCircle size={13} /> Approve & Download
          </button>
          <button className="btn btn-ghost" onClick={() => resolve.mutate('edit')} disabled={resolve.isPending}>
            Edit
          </button>
          <button className="btn btn-danger" onClick={() => resolve.mutate('reject')} disabled={resolve.isPending}>
            Reject
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Facts Ledger ───────────────────────────────────────────────────────────
function FactsLedger({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) return (
    <div className="text-center py-8" style={{ color: 'var(--ink-faint)', fontSize: 13 }}>
      No facts yet — they appear as the agent works
    </div>
  );

  return (
    <div className="space-y-2">
      {facts.map((fact, i) => (
        <motion.div
          key={fact.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-start gap-3 p-2 rounded"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
        >
          <div style={{ width: 4, height: '100%', background: fact.confidence > 0.9 ? 'var(--accent)' : fact.confidence > 0.75 ? 'var(--warn)' : 'var(--danger)', borderRadius: 2, flexShrink: 0, alignSelf: 'stretch' }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{fact.claim}</span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--accent)' }}>
                {fact.value}{fact.unit ? ` ${fact.unit}` : ''}
              </span>
              {fact.confidence < 0.8 && (
                <AlertTriangle size={11} style={{ color: 'var(--warn)', marginLeft: 'auto', flexShrink: 0 }} />
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              {fact.source.type.toUpperCase()}
              {fact.source.page ? ` · p.${fact.source.page}` : ''}
              {fact.source.text ? ` · ${fact.source.text}` : ''}
              <span className="ml-2" style={{ color: fact.confidence > 0.9 ? 'var(--ok)' : 'var(--warn)' }}>
                {(fact.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Plan DAG ───────────────────────────────────────────────────────────────
function PlanDAG({ steps }: { steps: PlanStep[] }) {
  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex items-start gap-3 py-2 px-3 rounded"
          style={{
            background: step.status === 'running' ? 'rgba(56,189,248,0.06)' : step.status === 'completed' ? 'rgba(198,255,61,0.04)' : 'transparent',
            border: step.status === 'running' ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
          }}
        >
          <div className="flex-shrink-0 mt-0.5">
            <StepIcon status={step.status} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.05)', color: AGENT_COLORS[step.agent] ?? 'var(--ink-dim)', fontSize: 10 }}
              >
                {AGENT_LABELS[step.agent] ?? step.agent}
              </span>
              {step.tool && (
                <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {step.tool}
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-faint)' }}>
                {step.completedAt && step.startedAt
                  ? `${((step.completedAt - step.startedAt) / 1000).toFixed(1)}s`
                  : step.status === 'running' ? '…' : ''}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 2, lineHeight: 1.4 }}>{step.goal}</p>
            {step.outputSummary && (
              <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3 }}>{step.outputSummary}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Artifact row ───────────────────────────────────────────────────────────
function ArtifactRow({ artifact }: { artifact: Artifact }) {
  const icons: Record<string, string> = { docx: '📄', pptx: '📊', xlsx: '📗', py: '🐍', md: '📝', pdf: '📑' };

  return (
    <div className="flex items-center gap-3 p-3 rounded" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
      <span style={{ fontSize: 20 }}>{icons[artifact.type] ?? '📎'}</span>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {artifact.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          {(artifact.sizeBytes / 1024).toFixed(0)} KB · v{artifact.version}
        </div>
      </div>
      <span className={`chip chip-${artifact.classification}`}>{artifact.classification}</span>
      <a
        href={`${API}/api/artifacts/${artifact.id}/download`}
        className="btn btn-ghost btn-sm"
        download={artifact.name}
      >
        <Download size={12} /> Download
      </a>
    </div>
  );
}

// ── Run View ───────────────────────────────────────────────────────────────
function RunView({ runId, onBack }: { runId: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'plan' | 'facts' | 'artifacts'>('plan');
  const qc = useQueryClient();

  const { data: run } = useQuery<Run>({
    queryKey: ['run', runId],
    queryFn: async () => (await fetch(`${API}/api/runs/${runId}`)).json(),
    refetchInterval: (q) => {
      const run = q.state.data as Run | undefined;
      return run?.status === 'running' ? 1500 : false;
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      await fetch(`${API}/api/runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['run', runId] }),
  });

  if (!run) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin" style={{ color: 'var(--ink-faint)' }} />
      </div>
    );
  }

  const completed = run.steps.filter(s => s.status === 'completed').length;
  const total = run.steps.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Run header */}
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--line)', flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate" style={{ fontSize: 14 }}>{run.title}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`dot ${run.status === 'running' ? 'dot-ok' : run.status === 'completed' ? 'dot-idle' : 'dot-danger'}`} />
            <span style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{run.status}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{completed}/{total} steps</span>
          </div>
        </div>
        <div className="flex gap-2">
          {run.status === 'running' && (
            <button className="btn btn-ghost btn-sm" onClick={() => cancel.mutate()}>
              <XCircle size={12} /> Cancel
            </button>
          )}
          <span className={`chip chip-${run.modelMode === 'demo' ? 'simulated' : 'live'}`}>
            {run.modelMode === 'demo' ? 'SIMULATED' : 'LIVE'}
          </span>
        </div>
      </div>

      {/* Progress */}
      {run.status === 'running' && (
        <div style={{ padding: '0 16px 0', background: 'var(--surface-1)', borderBottom: '1px solid var(--line)', paddingBottom: 8, paddingTop: 8, flexShrink: 0 }}>
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Approval card */}
      {run.status === 'running' && (
        <div className="px-4 pt-4" style={{ flexShrink: 0 }}>
          <ApprovalCard runId={runId} onResolved={() => qc.invalidateQueries({ queryKey: ['run', runId] })} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b px-4" style={{ borderColor: 'var(--line)', flexShrink: 0, marginTop: 12 }}>
        {(['plan', 'facts', 'artifacts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium transition-colors capitalize"
            style={{
              color: activeTab === tab ? 'var(--ink)' : 'var(--ink-faint)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {tab === 'plan' && `Plan (${run.steps.length})`}
            {tab === 'facts' && `Facts (${run.facts.length})`}
            {tab === 'artifacts' && `Artifacts (${run.artifacts.length})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'plan' && <PlanDAG steps={run.steps} />}
        {activeTab === 'facts' && <FactsLedger facts={run.facts} />}
        {activeTab === 'artifacts' && (
          <div className="space-y-2">
            {run.artifacts.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--ink-faint)', fontSize: 13 }}>
                Artifacts appear when the agent completes deliverables
              </div>
            ) : (
              run.artifacts.map(a => <ArtifactRow key={a.id} artifact={a} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Workbench ──────────────────────────────────────────────────────────
interface AttachedFile {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
  dataUrl?: string;
}

export default function WorkbenchPage() {
  const [goal, setGoal] = useState('');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  // ── File attachment ───────────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    for (const file of Array.from(files)) {
      // Read as data URL for preview
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Upload to server
      try {
        const res = await fetch(`${API}/api/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: dataUrl.substring(0, 500), // send just a preview
          }),
        });
        const att = await res.json();
        setAttachments(prev => [...prev, {
          id: att.id,
          name: file.name,
          type: file.type,
          sizeBytes: file.size,
          dataUrl: file.type.startsWith('image/') ? dataUrl : undefined,
        }]);

        // Auto-suggest goal based on file type
        if (!goal.trim()) {
          if (/\.(pdf|png|jpg|jpeg|tiff)$/i.test(file.name)) {
            setGoal(`Read and analyse the attached file "${file.name}" — extract key findings, data, and measurements`);
          } else if (/\.(xlsx|csv)$/i.test(file.name)) {
            setGoal(`Analyse the attached spreadsheet "${file.name}" — summarise key metrics, compute statistics, and identify trends`);
          } else if (/\.(docx|doc)$/i.test(file.name)) {
            setGoal(`Review the attached document "${file.name}" — summarise key points and extract action items`);
          }
        }
      } catch {
        console.error('Upload failed for', file.name);
      }
    }
    setIsUploading(false);
  }, [goal]);

  // Drag-and-drop onto the textarea card
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  // Paste image directly from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItem = Array.from(items).find(i => i.type.startsWith('image/'));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        handleFileSelect(dt.files);
      }
    }
  }, [handleFileSelect]);

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

  // ── Run creation ──────────────────────────────────────────────────────────
  const createRun = useMutation({
    mutationFn: async (g: string) => {
      const r = await fetch(`${API}/api/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: g,
          classification: 'confidential',
          attachments: attachments.map(a => a.name),
        }),
      });
      if (!r.ok) throw new Error('Failed to create run');
      return r.json() as Promise<Run>;
    },
    onSuccess: (run) => {
      setActiveRunId(run.id);
      setGoal('');
      setAttachments([]);
      qc.invalidateQueries({ queryKey: ['runs'] });
    },
  });

  const handleSubmit = useCallback(() => {
    if (!goal.trim() || createRun.isPending) return;
    createRun.mutate(goal.trim());
  }, [goal, createRun]);

  // Slash-command detection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    // Slash command shortcuts
    if (e.key === 'Tab' && goal.startsWith('/')) {
      e.preventDefault();
      const slashMap: Record<string, string> = {
        '/summarize': 'Summarise the following document concisely, extracting key findings and action items: ',
        '/calc': 'Calculate the ASME B31.3 minimum wall thickness and remaining life for line CDU-OH-114 (P=2.4 MPa, D=168.3mm, S=137.9MPa, t_current=4.35mm, CR=0.28mm/yr)',
        '/code': 'Write a Python script to ',
        '/deck': 'Create a professional PowerPoint presentation covering ',
        '/sheet': 'Build an Excel spreadsheet analysis for ',
        '/ask-kb': 'Search the knowledge base and answer: ',
        '/redact': 'Redact all sensitive information (names, prices, IDs) from the following document: ',
      };
      const cmd = Object.keys(slashMap).find(k => goal.toLowerCase().startsWith(k));
      if (cmd) setGoal(slashMap[cmd]);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [goal]);

  if (activeRunId) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <RunView runId={activeRunId} onBack={() => setActiveRunId(null)} />
      </div>
    );
  }

  const fileTypeIcon = (name: string) => {
    if (/\.(pdf|png|jpg|jpeg|tiff)$/i.test(name)) return '🖼';
    if (/\.(xlsx|csv)$/i.test(name)) return '📊';
    if (/\.(docx|doc)$/i.test(name)) return '📄';
    return '📎';
  };

  return (
    <div className="flex flex-col h-full" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-12"
      >
        <div className="display mb-2" style={{ fontSize: 48, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
          What shall we work on?
        </div>
        <p style={{ fontSize: 15, color: 'var(--ink-dim)' }}>
          Confidential work, processed entirely on-premises. <span style={{ color: 'var(--ok)' }}>Zero egress.</span>
        </p>
      </motion.div>

      {/* Input area */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card mb-6"
        style={{ borderColor: attachments.length > 0 ? 'var(--accent)' : goal ? 'var(--line-strong)' : 'var(--line)' }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Attached files */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ padding: '8px 16px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}
            >
              {attachments.map(att => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 rounded-md"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '3px 8px', fontSize: 12 }}
                >
                  {att.dataUrl ? (
                    <img src={att.dataUrl} alt={att.name} style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 2 }} />
                  ) : (
                    <span>{fileTypeIcon(att.name)}</span>
                  )}
                  <span style={{ color: 'var(--ink)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {att.name}
                  </span>
                  <span style={{ color: 'var(--ink-faint)', fontSize: 10 }}>
                    {(att.sizeBytes / 1024).toFixed(0)}KB
                  </span>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--ink-faint)', lineHeight: 1 }}
                    aria-label={`Remove ${att.name}`}
                  >
                    <XIcon size={11} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ padding: '12px 16px 8px' }}>
          <textarea
            ref={textareaRef}
            id="workbench-goal"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={attachments.length > 0
              ? `Describe what to do with ${attachments[0].name}…`
              : 'Describe your task… Type /summarize, /calc, /code, /deck, /ask-kb, /redact + Tab to expand\nor drag & drop a file here'}
            rows={3}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--ink)',
              fontSize: 15,
              lineHeight: 1.6,
              resize: 'none',
              fontFamily: 'IBM Plex Sans, sans-serif',
            }}
            aria-label="Task description"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 pb-3">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.xlsx,.csv,.docx,.doc,.txt,.md"
            style={{ display: 'none' }}
            onChange={e => handleFileSelect(e.target.files)}
          />
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Attach file (PDF, image, Excel, Word)"
            aria-label="Attach file"
          >
            {isUploading
              ? <Loader size={13} className="animate-spin" style={{ color: 'var(--ok)' }} />
              : <Paperclip size={13} />}
          </button>

          {/* Slash-command hints */}
          {goal.startsWith('/') && (
            <div className="flex gap-1 flex-wrap flex-1">
              {['/summarize', '/calc', '/code', '/deck', '/ask-kb', '/redact'].map(cmd => (
                <button
                  key={cmd}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 10, padding: '2px 6px', color: 'var(--accent)' }}
                  onClick={() => {
                    const slashMap: Record<string, string> = {
                      '/summarize': 'Summarise the following document concisely, extracting key findings and action items: ',
                      '/calc': 'Calculate the ASME B31.3 minimum wall thickness and remaining life for line CDU-OH-114 (P=2.4 MPa, D=168.3mm, S=137.9MPa, t_current=4.35mm, CR=0.28mm/yr)',
                      '/code': 'Write a Python script to ',
                      '/deck': 'Create a professional PowerPoint presentation covering ',
                      '/sheet': 'Build an Excel spreadsheet analysis for ',
                      '/ask-kb': 'Search the knowledge base and answer: ',
                      '/redact': 'Redact all sensitive information (names, prices, IDs) from the following document: ',
                    };
                    setGoal(slashMap[cmd] ?? cmd.slice(1) + ' ');
                    textareaRef.current?.focus();
                  }}
                >
                  {cmd}
                </button>
              ))}
            </div>
          )}
          {!goal.startsWith('/') && <span style={{ flex: 1 }} />}

          <span style={{ fontSize: 11, color: 'var(--ink-faint)', flexShrink: 0 }}>
            Enter ↵ to run
          </span>
          <button
            id="run-task-btn"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!goal.trim() || createRun.isPending}
          >
            {createRun.isPending ? <Loader size={13} className="animate-spin" /> : <Send size={13} />}
            {createRun.isPending ? 'Starting…' : 'Run Task'}
          </button>
        </div>
      </motion.div>

      {/* Error */}
      {createRun.isError && (
        <div className="flex items-center gap-2 p-3 rounded mb-4" style={{ background: 'rgba(255,107,61,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 13 }}>
          <AlertTriangle size={14} />
          Failed to start task — is the server running?
          <button className="btn btn-ghost btn-sm ml-auto" onClick={() => createRun.reset()}>Dismiss</button>
        </div>
      )}

      {/* Templates */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="mb-3 flex items-center gap-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <Zap size={12} />
          Task Templates
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 stagger">
          {TEMPLATES.map(tpl => (
            <motion.button
              key={tpl.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="card text-left p-4 cursor-pointer transition-all"
              style={{ background: 'var(--surface-1)', borderColor: 'var(--line)' }}
              onClick={() => { setGoal(tpl.goal); textareaRef.current?.focus(); }}
              aria-label={`Use template: ${tpl.label}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-md p-2" style={{ background: `${tpl.color}18` }}>
                  <tpl.icon size={16} style={{ color: tpl.color }} />
                </div>
                <div>
                  <div className="font-semibold mb-1" style={{ fontSize: 13, color: 'var(--ink)' }}>{tpl.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-dim)', lineHeight: 1.5 }}>{tpl.description}</div>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--ink-faint)', flexShrink: 0, marginLeft: 'auto', alignSelf: 'center' }} />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Recent runs */}
      <RecentRuns onSelect={setActiveRunId} />
    </div>
  );
}

// ── Recent Runs ────────────────────────────────────────────────────────────
function RecentRuns({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: runs, isLoading } = useQuery<Run[]>({
    queryKey: ['runs'],
    queryFn: async () => (await fetch(`${API}/api/runs`)).json(),
    refetchInterval: 5000,
  });

  if (isLoading) return (
    <div className="mt-8">
      <div className="skeleton h-4 w-24 mb-3" />
      {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 mb-2 rounded-lg" />)}
    </div>
  );

  if (!runs?.length) return null;

  const recent = runs.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 }}
      className="mt-8"
    >
      <h2 className="mb-3 flex items-center gap-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <Clock size={12} />
        Recent Runs
      </h2>
      <div className="space-y-2">
        {recent.map(run => (
          <button
            key={run.id}
            className="w-full text-left card p-3 transition-all hover:border-line-strong"
            onClick={() => onSelect(run.id)}
          >
            <div className="flex items-center gap-3">
              <span
                className="dot flex-shrink-0"
                style={{
                  background: run.status === 'completed' ? 'var(--accent)' : run.status === 'running' ? 'var(--ok)' : 'var(--danger)',
                  boxShadow: run.status === 'running' ? '0 0 8px var(--ok)' : 'none',
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate" style={{ fontSize: 13, color: 'var(--ink)' }}>{run.title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                  {run.steps.filter(s => s.status === 'completed').length}/{run.steps.length} steps
                  · {run.artifacts.length} artifacts
                  · {new Date(run.createdAt).toLocaleTimeString()}
                </div>
              </div>
              <span className={`chip chip-${run.classification}`}>{run.classification}</span>
              <ChevronRight size={14} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
