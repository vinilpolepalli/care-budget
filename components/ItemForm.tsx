'use client';
import { useState } from 'react';
import { CATEGORIES, MEMBERS, STATUSES, TODAY, type Item } from '@/lib/model';

export type ItemDraft = Omit<Item, 'id'>;
const blank: ItemDraft = { desc: '', category: 'Caregiver hours', amount: 0, payer: 'Ava', status: 'planned', date: TODAY };

export default function ItemForm({ initial, onSave, onCancel, busy }: {
  initial?: Item; onSave: (d: ItemDraft) => void; onCancel: () => void; busy: boolean;
}) {
  const [d, setD] = useState<ItemDraft>(initial ? { desc: initial.desc, category: initial.category, amount: initial.amount, payer: initial.payer, status: initial.status, date: initial.date } : blank);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const valid = d.desc.trim().length > 0 && Number(amount) > 0;
  return (
    <form
      aria-label={initial ? 'Edit expense' : 'Add expense'}
      onSubmit={(e) => { e.preventDefault(); if (valid) onSave({ ...d, amount: Number(amount) }); }}
      className="grid grid-cols-2 gap-3 border-b border-hair bg-brand-tint/40 p-3 sm:grid-cols-6"
    >
      <p className="label col-span-2 sm:col-span-6">{initial ? 'Edit expense' : 'Add expense'}</p>
      <label className="col-span-2 sm:col-span-3"><span className="label">Description</span>
        <input className="field mt-1" value={d.desc} maxLength={120} onChange={(e) => set('desc', e.target.value)} placeholder="e.g. Home aide, 10 hrs" autoFocus /></label>
      <label className="col-span-2 sm:col-span-2"><span className="label">Category</span>
        <select className="field mt-1" value={d.category} onChange={(e) => set('category', e.target.value as Item['category'])}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label><span className="label">Amount (USD)</span>
        <input className="field num mt-1" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></label>
      <label><span className="label">Paid by</span>
        <select className="field mt-1" value={d.payer} onChange={(e) => set('payer', e.target.value as Item['payer'])}>
          {MEMBERS.map((m) => <option key={m}>{m}</option>)}</select></label>
      <label><span className="label">Status</span>
        <select className="field mt-1" value={d.status} onChange={(e) => set('status', e.target.value as Item['status'])}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label><span className="label">Date</span>
        <input className="field num mt-1" type="date" value={d.date} onChange={(e) => set('date', e.target.value)} /></label>
      <div className="col-span-2 flex gap-2 sm:col-span-6">
        <button className="btn-primary" disabled={!valid || busy}>{initial ? 'Save changes' : 'Add expense'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
