'use client';
import { useCallback, useEffect, useState } from 'react';
import Flags from './Flags';
import Ledger from './Ledger';
import Projection from './Projection';
import SummaryPanel from './SummaryPanel';
import type { ItemDraft } from './ItemForm';
import type { BoardData } from './types';

async function call(url: string, method = 'GET', body?: unknown): Promise<{ ok: boolean; data: any }> {
  const r = await fetch(url, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  return { ok: r.ok, data: await r.json().catch(() => ({ error: 'unreadable response' })) };
}

export default function Board() {
  const [b, setB] = useState<BoardData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { call('/api/summary').then((r) => (r.ok ? setB(r.data) : setErr(r.data.error))).catch(() => setErr('Could not reach the server')); }, []);

  /** Run a write; on success replace the board with the server's recomputed one. */
  const write = useCallback(async (url: string, method: string, body?: unknown) => {
    setBusy(true); setErr(null);
    try {
      const r = await call(url, method, body);
      if (r.ok) { setB(r.data.board); return true; }
      setErr(r.data.error ?? 'Request failed');
    } catch { setErr('Could not reach the server'); } finally { setBusy(false); }
    return false;
  }, []);

  if (!b) return <p className="py-10 text-sm text-ink-soft" role="status">{err ?? 'Loading the Demo family board...'}</p>;
  const ageById = Object.fromEntries(b.flags.pendingAging.items.map((i) => [i.id, i.ageDays]));
  const patch = (p: object) => write('/api/settings', 'PATCH', p);

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-soft">{b.notice}</p>
      {err && <p role="alert" className="rounded-field border border-brand/40 bg-brand-tint px-3 py-2 text-sm text-brand">{err}</p>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <Ledger items={b.items} range={b.range?.label ?? null} ageById={ageById} busy={busy}
          onAdd={(d: ItemDraft) => write('/api/ledger', 'POST', d)}
          onEdit={(id, d) => write(`/api/ledger/${id}`, 'PATCH', d)}
          onDelete={(id) => void write(`/api/ledger/${id}`, 'DELETE')} />
        <div className="space-y-4">
          <SummaryPanel b={b} busy={busy} patch={patch} />
          <Flags b={b} busy={busy} patch={patch} />
        </div>
      </div>
      <Projection b={b} busy={busy} patch={patch} />
      <div><button className="btn" disabled={busy} onClick={() => void write('/api/reset', 'POST')}>Reset to the Demo family</button></div>
    </div>
  );
}
