import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, CheckCircle, XCircle, Download, RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react';
import type { AuditEntry } from '@vajra/shared';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

const ROLES = [
  { id: 'engineer', label: 'Inspection Engineer', color: 'var(--ok)', perms: ['read', 'request-approval'] },
  { id: 'dept-head', label: 'Department Head', color: 'var(--accent)', perms: ['read', 'approve', 'request-approval'] },
  { id: 'it-security', label: 'IT Security Officer', color: 'var(--warn)', perms: ['read', 'admin', 'audit'] },
  { id: 'auditor', label: 'Auditor', color: 'var(--info)', perms: ['read', 'audit', 'export'] },
];

const TOOL_TOGGLE_DEFS = [
  { id: 'fs.read', label: 'File Read', risk: 'low' },
  { id: 'fs.write', label: 'File Write', risk: 'medium' },
  { id: 'kb.search', label: 'Knowledge Base Search', risk: 'low' },
  { id: 'code.run', label: 'Sandbox Code Execution', risk: 'medium' },
  { id: 'docx.generate', label: 'Document Generation', risk: 'low' },
  { id: 'pptx.generate', label: 'Presentation Generation', risk: 'low' },
  { id: 'sheet.write', label: 'Spreadsheet Write', risk: 'low' },
  { id: 'redact.scan', label: 'DLP/Redaction', risk: 'low' },
  { id: 'drawing.extract_tags', label: 'Drawing Tag Extraction', risk: 'low' },
];

export default function AdminPage() {
  const qc = useQueryClient();

  const { data: audit } = useQuery<AuditEntry[]>({
    queryKey: ['audit'],
    queryFn: async () => (await fetch(`${API}/api/audit`)).json(),
    refetchInterval: 5000,
  });

  const { data: status } = useQuery({
    queryKey: ['admin-status'],
    queryFn: async () => (await fetch(`${API}/api/admin/status`)).json(),
    refetchInterval: 10000,
  });

  // Live tool allowlist from server
  const { data: toolsData, refetch: refetchTools } = useQuery<{ id: string; enabled: boolean }[]>({
    queryKey: ['admin-tools'],
    queryFn: async () => (await fetch(`${API}/api/admin/tools`)).json(),
    refetchInterval: false,
  });

  const toggleTool = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const r = await fetch(`${API}/api/admin/tools/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      return r.json();
    },
    onSuccess: () => refetchTools(),
  });

  const verify = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/api/audit/verify`, { method: 'POST' });
      return r.json() as Promise<{ ok: boolean; chainLength?: number }>;
    },
  });

  const resetDemo = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/api/admin/reset`, { method: 'POST' });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });

  // Merge server tool state with local defs
  const toolToggleState = TOOL_TOGGLE_DEFS.map(def => ({
    ...def,
    enabled: toolsData?.find(t => t.id === def.id)?.enabled ?? true,
  }));

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div className="flex items-start gap-4 mb-6">
        <div>
          <h1 className="display mb-1" style={{ fontSize: 32, fontWeight: 700 }}>Admin & Governance</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
            System configuration, roles, audit log, and sovereignty verification.
          </p>
        </div>
        {/* Reset Demo */}
        <button
          className="btn btn-ghost btn-sm ml-auto"
          style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
          onClick={() => {
            if (confirm('Reset all demo data to seed state? This clears runs, audit log, and network events.')) {
              resetDemo.mutate();
            }
          }}
          disabled={resetDemo.isPending}
        >
          {resetDemo.isPending
            ? <RefreshCw size={12} className="animate-spin" />
            : <RotateCcw size={12} />}
          Reset Demo
        </button>
        {resetDemo.isSuccess && (
          <span style={{ fontSize: 12, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={12} /> Reset complete
          </span>
        )}
      </div>

      {/* System status */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Model Mode', value: status.modelMode.toUpperCase(), color: 'var(--info)' },
            { label: 'Version', value: status.version, color: 'var(--ink)' },
            { label: 'Uptime', value: `${Math.floor(status.uptime / 60)}m`, color: 'var(--ok)' },
            { label: 'Audit Entries', value: status.auditEntries, color: 'var(--accent)' },
          ].map(s => (
            <div key={s.label} className="card p-3">
              <div style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
              <div className="metric-medium" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Roles */}
        <div className="card">
          <div className="card-header">
            <Shield size={14} style={{ color: 'var(--accent)' }} />
            <span className="font-semibold">Roles & Permissions</span>
          </div>
          <div className="card-body space-y-3">
            {ROLES.map(role => (
              <div key={role.id} className="p-3 rounded" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: role.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{role.label}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.perms.map(p => (
                    <span key={p} className="chip chip-public" style={{ fontSize: 10 }}>{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tool toggles — live state */}
        <div className="card">
          <div className="card-header">
            <Shield size={14} style={{ color: 'var(--warn)' }} />
            <span className="font-semibold">Tool Allowlist</span>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 4 }}>Click to toggle</span>
          </div>
          <div className="card-body space-y-2">
            {toolToggleState.map(tool => (
              <div
                key={tool.id}
                className="flex items-center gap-3 cursor-pointer rounded p-1 transition-colors"
                style={{ background: toggleTool.isPending ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                onClick={() => toggleTool.mutate({ id: tool.id, enabled: !tool.enabled })}
                role="switch"
                aria-checked={tool.enabled}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && toggleTool.mutate({ id: tool.id, enabled: !tool.enabled })}
              >
                <motion.div
                  className="rounded flex-shrink-0"
                  style={{
                    width: 28, height: 16,
                    background: tool.enabled ? 'var(--ok)' : 'var(--surface-3)',
                    border: '1px solid var(--line)',
                    display: 'flex', alignItems: 'center', padding: '0 2px',
                    cursor: 'pointer',
                  }}
                >
                  <motion.div
                    animate={{ x: tool.enabled ? 12 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{ width: 12, height: 12, borderRadius: 6, background: '#fff' }}
                  />
                </motion.div>
                <span style={{ fontSize: 12, color: tool.enabled ? 'var(--ink)' : 'var(--ink-faint)', flex: 1 }}>
                  {tool.label}
                </span>
                <span
                  className="chip"
                  style={{
                    fontSize: 9,
                    background: tool.risk === 'low' ? 'rgba(56,189,248,0.1)' : 'rgba(251,191,36,0.1)',
                    color: tool.risk === 'low' ? 'var(--ok)' : 'var(--warn)',
                  }}
                >
                  {tool.risk}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit log */}
      <div className="card mt-6">
        <div className="card-header">
          <Shield size={14} style={{ color: 'var(--info)' }} />
          <span className="font-semibold">Tamper-Evident Audit Log</span>
          <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 4 }}>SHA-256 hash chain</span>
          <div className="ml-auto flex gap-2">
            {verify.data && (
              <span className="flex items-center gap-1" style={{ fontSize: 12, color: verify.data.ok ? 'var(--ok)' : 'var(--danger)', fontWeight: 600 }}>
                {verify.data.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {verify.data.ok ? `Chain verified (${verify.data.chainLength} entries)` : 'CHAIN TAMPERED!'}
              </span>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => verify.mutate()} disabled={verify.isPending}>
              {verify.isPending ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle size={11} />}
              Verify Chain
            </button>
            <a href={`${API}/api/audit/export`} className="btn btn-ghost btn-sm" download="vajra-audit.json">
              <Download size={11} /> Export
            </a>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>Action</th>
                <th>SHA-256 Hash</th>
                <th>Prev Hash</th>
              </tr>
            </thead>
            <tbody>
              {(audit ?? []).slice(0, 20).map(entry => (
                <tr key={entry.id}>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{entry.id}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    {new Date(entry.ts).toLocaleString()}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {(entry.payload as any)?.action ?? JSON.stringify(entry.payload).substring(0, 50)}
                  </td>
                  <td className="mono" style={{ fontSize: 10, color: 'var(--info)' }}>
                    {entry.hash?.substring(0, 20)}…
                  </td>
                  <td className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                    {entry.prevHash?.substring(0, 16) || '—'}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!audit?.length && (
            <div className="text-center py-6" style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading…</div>
          )}
        </div>
      </div>

      {/* Sovereignty statement */}
      <div
        className="mt-6 p-4 rounded-lg"
        style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Shield size={18} style={{ color: 'var(--ok)' }} />
          <span className="font-semibold" style={{ fontSize: 16, color: 'var(--ok)' }}>Sovereignty Statement</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Data stays on-premises', desc: 'Zero external API calls. All inference runs locally. Egress guard blocks all outbound traffic not on the RFC1918 allowlist.' },
            { title: 'Tamper-evident audit', desc: 'Every action is logged with a SHA-256 hash chain. Chain integrity is verifiable by any party. Export to CSV/JSON at any time.' },
            { title: 'Verifiable air-gap', desc: 'The red-team panel documents real blocked attempts. The sovereignty report is signed JSON + human-readable PDF.' },
          ].map(item => (
            <div key={item.title}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={13} style={{ color: 'var(--ok)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ok)' }}>{item.title}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-dim)', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
