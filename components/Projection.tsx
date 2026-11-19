import { usd } from '@/lib/calc';
import NumField from './NumField';
import type { BoardData } from './types';

export default function Projection({ b, busy, patch }: { b: BoardData; busy: boolean; patch: (p: object) => void }) {
  const p = b.projection;
  return (
    <section className="card p-4" aria-labelledby="proj-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="proj-h" className="text-base font-semibold">12-month projection</h2>
          <p className="num text-xs text-ink-faint">{p.formula}; month 1 = listed net {usd(b.summary.net)}, treated as one month of cost</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-ink-soft"><span>Growth g per month</span>
          <NumField label="Monthly growth percent" value={b.settings.growthPct} min={0} max={10} step={0.5} suffix="%" disabled={busy} onCommit={(n) => patch({ growthPct: n })} /></div>
      </div>
      <ol className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(7.75rem,1fr))] gap-2">
        {p.months.map((m) => (
          <li key={m.month} className={`rounded-field border p-2 text-center ${m.checkpoint ? 'border-brand bg-brand-tint' : 'border-hair'}`}>
            <div className="label">M{m.month}</div>
            <div className="num text-xs">{usd(m.value)}</div>
            {m.checkpoint && <div className="num mt-1 border-t border-brand/30 pt-1 text-[11px] text-brand">cum {usd(m.cumulative)}</div>}
          </li>
        ))}
      </ol>
      <p className="num mt-2 text-xs text-ink-soft">Cumulative: 3 months {usd(p.cumulative.m3)} / 6 months {usd(p.cumulative.m6)} / 12 months {usd(p.cumulative.m12)}</p>
    </section>
  );
}
