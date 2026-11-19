import { usd } from '@/lib/calc';
import type { BoardData } from './types';
import NumField from './NumField';

const State = ({ on }: { on: boolean }) => (
  <span className={`chip ${on ? 'border-brand bg-brand text-white' : 'border-hair bg-zinc-50 text-ink-soft'}`}>{on ? 'ACTIVE' : 'CLEAR'}</span>
);

export default function Flags({ b, busy, patch }: { b: BoardData; busy: boolean; patch: (p: object) => void }) {
  const { overBudget: o, pendingAging: w } = b.flags;
  return (
    <section className="card p-4" aria-labelledby="flags-h">
      <h2 id="flags-h" className="text-base font-semibold">Flags</h2>
      <p className="text-xs text-ink-faint">Computed on the server against fixed demo today, {b.today}.</p>
      <div className="mt-3 space-y-4 text-sm">
        <div>
          <div className="flex items-center justify-between"><h3 className="font-medium">OVER BUDGET</h3><State on={o.state === 'active'} /></div>
          <p className="num mt-1 text-ink-soft">listed net {usd(o.compared.net)} {o.state === 'active' ? '>' : '<='} budget {usd(o.compared.budget)}
            {o.state === 'active' && <> (over by {usd(o.overBy)})</>}</p>
          <p className="text-xs text-ink-faint">Rule: {o.rule}.</p>
        </div>
        <div>
          <div className="flex items-center justify-between"><h3 className="font-medium">{w.label}</h3><State on={w.state === 'active'} /></div>
          <p className="num mt-1 text-ink-soft">oldest pending expense {w.compared.oldestPendingDays === null ? 'none' : `${w.compared.oldestPendingDays}d old`}
            {' '}vs threshold {w.threshold}d</p>
          <p className="text-xs text-ink-faint">Rule: {w.rule}.</p>
          {w.items.length > 0 && (
            <ul className="mt-1 text-xs text-ink-soft">
              {w.items.map((i) => <li key={i.id} className="flex justify-between gap-2"><span className="truncate">{i.desc} ({i.ageDays}d old)</span><span className="num">{usd(i.amount)}</span></li>)}
              <li className="num mt-0.5 flex justify-between border-t border-hair pt-0.5"><span>Aging pending total</span><span>{usd(w.total)}</span></li>
            </ul>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs text-ink-faint">
            <span>Age threshold, days:</span>
            <NumField label="Pending days threshold" value={b.settings.pendingDaysThreshold} min={1} max={365} disabled={busy} onCommit={(n) => patch({ pendingDaysThreshold: n })} />
          </div>
        </div>
      </div>
    </section>
  );
}
