import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';import {
  BookOpen, FileText, Search, Filter, Grid, List,
  CheckCircle, Clock, AlertCircle, Upload, Eye, X as XIcon
} from 'lucide-react';
import type { KbDocument, KbChunk } from '@vajra/shared';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

// ── Collection color ────────────────────────────────────────────────────────
const COLLECTION_COLORS: Record<string, string> = {
  'inspection-sops': 'var(--ok)',
  'engineering': 'var(--accent)',
  'moc': 'var(--info)',
  'board': 'var(--warn)',
  'operations': 'var(--ok)',
  'procurement': 'var(--ink-dim)',
  'inspection-history': 'var(--info)',
};

// ── Document detail modal ───────────────────────────────────────────────────
function DocDetail({ doc, onClose }: { doc: KbDocument; onClose: () => void }) {
  const { data: search } = useQuery({
    queryKey: ['kb-search', doc.name],
    queryFn: async () => {
      const r = await fetch(`${API}/api/kb/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: doc.name.split(' ').slice(0, 3).join(' '), limit: 4 }),
      });
      return r.json() as Promise<{ chunks: KbChunk[] }>;
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: 'var(--surface-1)', borderRadius: 12, border: '1px solid var(--line)', maxWidth: 640, width: '100%', maxHeight: '80vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>{doc.name}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
            <XIcon size={16} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Type', value: doc.type.toUpperCase() },
              { label: 'Pages', value: doc.pageCount },
              { label: 'Chunks', value: doc.chunkCount },
              { label: 'Size', value: `${(doc.sizeBytes / 1024).toFixed(0)} KB` },
              { label: 'Collection', value: doc.collection },
              { label: 'Status', value: doc.ingestStatus },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mb-4">
            <span className={`chip chip-${doc.classification}`}>{doc.classification}</span>
            {doc.ingestedAt && (
              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                Indexed {new Date(doc.ingestedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {search?.chunks && search.chunks.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Sample Chunks
              </div>
              <div className="space-y-2">
                {search.chunks.slice(0, 3).map(chunk => (
                  <div key={chunk.id} style={{ background: 'var(--surface-2)', borderRadius: 6, padding: 12, borderLeft: '3px solid var(--ok)' }}>
                    <div style={{ fontSize: 11, color: 'var(--ok)', marginBottom: 4 }}>{chunk.section} · p.{chunk.page}</div>
                    <p style={{ fontSize: 12, color: 'var(--ink-dim)', lineHeight: 1.6 }}>{chunk.text.substring(0, 180)}…</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Document card ───────────────────────────────────────────────────────────
function DocCard({ doc, onClick }: { doc: KbDocument; onClick: () => void }) {
  const icons: Record<string, string> = { pdf: '📑', docx: '📄', xlsx: '📗', pptx: '📊', eml: '✉️' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-3 cursor-pointer"
      whileHover={{ borderColor: 'var(--line-strong)' }}
    >
      <div className="flex items-start gap-3">
        <span style={{ fontSize: 22, flexShrink: 0 }}>{icons[doc.type] ?? '📎'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.name}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`chip chip-${doc.classification}`}>{doc.classification}</span>
            <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              {doc.pageCount}p · {(doc.sizeBytes / 1024).toFixed(0)}KB · {doc.chunkCount} chunks
            </span>
            <span
              style={{
                fontSize: 10, color: COLLECTION_COLORS[doc.collection] ?? 'var(--ink-faint)',
                background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 4,
              }}
            >
              {doc.collection}
            </span>
          </div>
          {doc.ingestStatus === 'indexed' && (
            <div style={{ marginTop: 4 }}>
              <div className="progress-bar" style={{ height: 2 }}>
                <div className="progress-fill progress-fill-ok" style={{ width: '100%' }} />
              </div>
            </div>
          )}
          {doc.ingestStatus === 'processing' && (
            <div style={{ marginTop: 4 }}>
              <div className="progress-bar" style={{ height: 2 }}>
                <div className="progress-fill" style={{ width: `${doc.ingestProgress}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          {doc.ingestStatus === 'indexed' && <CheckCircle size={14} style={{ color: 'var(--accent)' }} />}
          {doc.ingestStatus === 'processing' && <Clock size={14} style={{ color: 'var(--warn)' }} className="animate-spin" />}
          {doc.ingestStatus === 'failed' && <AlertCircle size={14} style={{ color: 'var(--danger)' }} />}
        </div>
      </div>
    </motion.div>
  );
}

// ── Search results ──────────────────────────────────────────────────────────
function SearchResults({ query }: { query: string }) {
  const { data, isFetching } = useQuery({
    queryKey: ['kb-search', query],
    queryFn: async () => {
      const r = await fetch(`${API}/api/kb/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 8 }),
      });
      return r.json() as Promise<{ chunks: KbChunk[]; totalFound: number; retrievalMode: string }>;
    },
    enabled: query.length > 2,
  });

  if (query.length <= 2) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Search Results
        </h3>
        {data && (
          <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            {data.totalFound} chunks · {data.retrievalMode}
          </span>
        )}
        {isFetching && <Clock size={11} className="animate-spin" style={{ color: 'var(--ink-faint)' }} />}
      </div>
      <div className="space-y-2">
        {(data?.chunks ?? []).map(chunk => (
          <div
            key={chunk.id}
            className="card p-3"
            style={{ borderLeft: '3px solid var(--ok)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ok)' }}>{chunk.docName}</span>
              <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>p.{chunk.page} · {chunk.section}</span>
              <span className="mono ml-auto" style={{ fontSize: 11, color: 'var(--accent)' }}>
                {(chunk.score * 100).toFixed(0)}%
              </span>
              <span className={`chip chip-${chunk.classification}`} style={{ fontSize: 9 }}>{chunk.classification}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-dim)', lineHeight: 1.6 }}>
              {chunk.text.substring(0, 200)}{chunk.text.length > 200 ? '…' : ''}
            </p>
          </div>
        ))}
        {data?.chunks.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center', padding: '24px 0' }}>
            No chunks found — try a different query
          </div>
        )}
      </div>
    </div>
  );
}

// ── Knowledge page ──────────────────────────────────────────────────────────
export default function KnowledgePage() {
  const [query, setQuery] = useState('');
  const [filterCollection, setFilterCollection] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<KbDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: docs, isLoading } = useQuery<KbDocument[]>({
    queryKey: ['kb-docs'],
    queryFn: async () => (await fetch(`${API}/api/kb/documents`)).json(),
    refetchInterval: 4000,
  });

  // Ingest Documents mutation
  const ingest = useMutation({
    mutationFn: async (file: File) => {
      const r = await fetch(`${API}/api/kb/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          type: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          collection: 'user-uploads',
          classification: 'confidential',
        }),
      });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb-docs'] }),
  });

  const handleIngestFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      ingest.mutate(file);
    }
  };

  const collections = [...new Set(docs?.map(d => d.collection) ?? [])];
  const filtered = docs?.filter(d => !filterCollection || d.collection === filterCollection) ?? [];
  const totalChunks = docs?.reduce((s, d) => s + d.chunkCount, 0) ?? 0;
  const totalSize = docs?.reduce((s, d) => s + d.sizeBytes, 0) ?? 0;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Doc detail modal */}
      <AnimatePresence>
        {selectedDoc && (
          <DocDetail doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.pptx,.eml,.png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={e => handleIngestFiles(e.target.files)}
      />

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div>
          <h1 className="display mb-1" style={{ fontSize: 32, fontWeight: 700 }}>Knowledge Base</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
            Local document corpus — all retrieval happens on-premises. Nothing leaves.
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm ml-auto"
          onClick={() => fileInputRef.current?.click()}
          disabled={ingest.isPending}
        >
          {ingest.isPending
            ? <><Clock size={13} className="animate-spin" /> Ingesting…</>
            : <><Upload size={13} /> Ingest Documents</>}
        </button>
      </div>

      {/* Ingest success toast */}
      {ingest.isSuccess && (
        <div className="flex items-center gap-2 p-3 rounded mb-4" style={{ background: 'rgba(198,255,61,0.08)', border: '1px solid rgba(198,255,61,0.2)', fontSize: 13, color: 'var(--accent)' }}>
          <CheckCircle size={14} />
          Document ingestion started — progress updates every few seconds
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Documents', value: docs?.length ?? 0 },
          { label: 'Chunks', value: totalChunks.toLocaleString() },
          { label: 'Total Size', value: `${(totalSize / 1024 / 1024).toFixed(1)}MB` },
          { label: 'Collections', value: collections.length },
        ].map(s => (
          <div key={s.label} className="card p-3">
            <div style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
            <div className="metric-medium" style={{ color: 'var(--ink)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="card mb-4" style={{ overflow: 'visible' }}>
        <div className="card-body">
          <div className="flex items-center gap-3">
            <Search size={15} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search knowledge base… (BM25 + vector hybrid retrieval)"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--ink)', fontSize: 14, fontFamily: 'IBM Plex Sans, sans-serif',
              }}
              aria-label="Search knowledge base"
            />
            {query && (
              <button className="btn btn-ghost btn-sm" onClick={() => setQuery('')}>Clear</button>
            )}
          </div>
          <SearchResults query={query} />
        </div>
      </div>

      {/* Collection filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={12} style={{ color: 'var(--ink-faint)' }} />
        <button
          className={`btn btn-sm ${!filterCollection ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilterCollection('')}
        >
          All ({docs?.length ?? 0})
        </button>
        {collections.map(c => (
          <button
            key={c}
            className={`btn btn-sm ${filterCollection === c ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilterCollection(c === filterCollection ? '' : c)}
          >
            {c} ({docs?.filter(d => d.collection === c).length ?? 0})
          </button>
        ))}
      </div>

      {/* Document grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-20 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {filtered.map(doc => (
            <DocCard key={doc.id} doc={doc} onClick={() => setSelectedDoc(doc)} />
          ))}
        </div>
      )}

      {/* Injection warning */}
      {docs?.find(d => d.name.includes('INJECTION')) && (
        <div
          className="flex items-start gap-3 p-3 rounded-lg mt-4"
          style={{ background: 'rgba(255,107,61,0.08)', border: '1px solid rgba(255,107,61,0.3)' }}
        >
          <AlertCircle size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>Injection Payload Detected</div>
            <div style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
              The "Faded SOP Scan" document contains a prompt injection payload ("ignore previous instructions…"). VAJRA wrapped this as untrusted DATA and the agent ignored it. See Network → Red-Team Panel for a live demonstration.
            </div>
          </div>
          <span className="chip flex-shrink-0" style={{ background: 'rgba(255,107,61,0.2)', color: 'var(--danger)' }}>BLOCKED</span>
        </div>
      )}
    </div>
  );
}
