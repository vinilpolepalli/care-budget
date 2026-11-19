'use client';
import { usd } from '@/lib/calc';
import { MEMBERS } from '@/lib/model';
import NumField from './NumField';
import type { BoardData } from './types';

const Row = ({ k, v, strong }: { k: React.ReactNode; v: string; strong?: boolean }) => (
  <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? 'border-t border-hair pt-2.5' : ''}`}>
    <dt className={strong ? 'font-semibold' : 'text-ink-soft'}>{k}</dt>
    <dd className={`num ${strong ? 'text-lg font-semibold' : ''}`}>{v}</dd>
  </div>
);

export default function SummaryPanel({ b, busy, patch }: { b: BoardData; busy: boolean; patch: (p: object) => void }) {
  const { summary: s, settings: st } = b;
  return (
    <aside className="card p-4" aria-labelledby="sum-h">
      <h2 id="sum-h" className="text-base font-semibold">Summary</h2>
      <dl className="mt-2 text-sm">
        <Row k="Listed spend" v={usd(s.gross)} />
        <div className="flex items-center justify-between gap-3 py-1.5">
          <dt className="text-ink-soft">Insurance reimbursement<span className="block text-xs text-ink-faint">illustrative, of {usd(s.eligible)} meds + supplies</span></dt>
          <dd className="flex items-center gap-2"><NumField label="Insurance reimbursement rate percent" value={st.insuranceRatePct} min={0} max={100} suffix="%" disabled={busy} onCommit={(n) => patch({ insuranceRatePct: n })} />
            <span className="num w-20 text-right">-{usd(s.insurance)}</span></dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5">
          <dt className="text-ink-soft">State caregiving stipend<span className="block text-xs text-ink-faint">illustrative flat $/mo, applied once to the listed expenses</span></dt>
          <dd className="flex items-center gap-2"><NumField label="State caregiving stipend per month" value={st.stipend} min={0} prefix="$" step={10} disabled={busy} onCommit={(n) => patch({ stipend: n })} />
            <span className="num w-20 text-right">-{usd(s.stipend)}</span></dd>
        </div>
        <Row k="Total offsets (illustrative)" v={`-${usd(s.offsets)}`} />
        <Row strong k="Listed net out-of-pocket" v={usd(s.net)} />
        {s.unusedOffsets > 0 && <p className="text-xs text-ink-faint">Offsets exceed spend by {usd(s.unusedOffsets)}; net is held at $0.00.</p>}
      </dl>
      <p className="mt-2 text-xs text-ink-faint">{b.offsetNotice}</p>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-hair pt-3">
        <label htmlFor="budget" className="text-sm text-ink-soft">Monthly budget<span className="block text-xs text-ink-faint">listed net is compared against it</span></label>
        <NumField id="budget" label="Monthly budget" value={st.budget} min={0} prefix="$" step={100} disabled={busy} onCommit={(n) => patch({ budget: n })} />
      </div>

      <div className="mt-4 border-t border-hair pt-3">
        <div className="flex items-baseline justify-between"><h3 className="label">Split of listed net</h3>
          <span className="num text-xs text-ink-faint">shares sum {s.shareSum}</span></div>
        <ul className="mt-1 text-sm">
          {s.split.map((r, k) => (
            <li key={r.member} className="flex items-center justify-between gap-2 py-1.5">
              <span className="w-10">{r.member}</span>
              <NumField label={`${r.member} share`} value={st.shares[MEMBERS[k]]} min={0} max={100} suffix="%" disabled={busy} onCommit={(n) => patch({ shares: { [r.member]: n } })} />
              <span className="num w-14 text-right text-xs text-ink-faint">{r.pct.toFixed(1)}%</span>
              <span className="num w-24 text-right">{usd(r.amount)}</span>
            </li>
          ))}
        </ul>
        {s.shareWarning && (
          <p role="alert" className="mt-2 rounded-field border border-brand/40 bg-brand-tint px-2.5 py-1.5 text-xs text-brand">
            Shares sum to {s.shareSum}, not 100. Amounts are normalized by the sum (share / {s.shareSum}).
          </p>
        )}
        <p className="mt-2 text-xs text-ink-faint">Paid so far (status: paid): {s.paidBy.map((p) => `${p.member} ${usd(p.amount)}`).join(' / ')}</p>
      </div>
    </aside>
  );
}
