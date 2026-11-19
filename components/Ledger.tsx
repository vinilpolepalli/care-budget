'use client';
import { useState } from 'react';
import { usd } from '@/lib/calc';
import type { Item } from '@/lib/model';
import ItemForm, { type ItemDraft } from './ItemForm';

const chip: Record<Item['status'], string> = {
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  pending: 'border-brand/40 bg-brand-tint text-brand',
  planned: 'border-hair bg-zinc-50 text-ink-soft',
};

export default function Ledger({ items, range, ageById, busy, onAdd, onEdit, onDelete }: {
  items: Item[]; range: string | null; ageById: Record<string, number>; busy: boolean;
  onAdd: (d: ItemDraft) => Promise<boolean>; onEdit: (id: string, d: ItemDraft) => Promise<boolean>; onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <section className="card overflow-hidden" aria-labelledby="ledger-h">
      <div className="flex items-center justify-between gap-2 border-b border-hair p-3">
        <div>
          <h2 id="ledger-h" className="text-base font-semibold">Recent expenses</h2>
          <p className="text-xs text-ink-faint">{items.length} expenses{range ? `, ${range}` : ''}</p>
        </div>
        {!adding && <button className="btn-primary" onClick={() => { setAdding(true); setEditing(null); }}>Add expense</button>}
      </div>
      {adding && <ItemForm busy={busy} onCancel={() => setAdding(false)} onSave={async (d) => { if (await onAdd(d)) setAdding(false); }} />}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-hair text-left">
              {['Date', 'Description', 'Category', 'Paid by', 'Status', 'Amount', ''].map((h, k) => (
                <th key={k} className={`label px-3 py-2 font-normal ${h === 'Amount' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-faint">No expenses yet. Add the first one.</td></tr>}
            {items.map((i) => editing === i.id ? (
              <tr key={i.id}><td colSpan={7} className="p-0">
                <ItemForm initial={i} busy={busy} onCancel={() => setEditing(null)} onSave={async (d) => { if (await onEdit(i.id, d)) setEditing(null); }} />
              </td></tr>
            ) : (
              <tr key={i.id} className="border-b border-hair last:border-0">
                <td className="num whitespace-nowrap px-3 py-2 text-ink-soft">{i.date.slice(5)}</td>
                <td className="px-3 py-2">{i.desc}
                  {i.status === 'pending' && ageById[i.id] !== undefined && <span className="num ml-2 text-xs text-ink-faint">pending, dated {ageById[i.id]}d ago</span>}</td>
                <td className="px-3 py-2 text-ink-soft">{i.category}</td>
                <td className="px-3 py-2">{i.payer}</td>
                <td className="px-3 py-2"><span className={`chip ${chip[i.status]}`}>{i.status}</span></td>
                <td className="num px-3 py-2 text-right">{usd(i.amount)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button className="text-brand hover:text-brand-hover hover:underline" onClick={() => { setEditing(i.id); setAdding(false); }} aria-label={`Edit ${i.desc}`}>Edit</button>
                  {confirm === i.id ? (
                    <button className="ml-3 font-medium text-brand hover:underline" onClick={() => { setConfirm(null); onDelete(i.id); }} onBlur={() => setConfirm(null)} autoFocus>Confirm delete</button>
                  ) : (
                    <button className="ml-3 text-ink-soft hover:text-ink hover:underline" onClick={() => setConfirm(i.id)} aria-label={`Delete ${i.desc}`}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
