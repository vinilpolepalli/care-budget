import { describe, expect, it } from 'vitest';
import { allocateCents, computeFlags, daysBetween, project, summarize } from '../lib/calc';
import { DEFAULT_SETTINGS as S, seedItems, type Item } from '../lib/model';

let n = 0;
const items: Item[] = seedItems(() => `i${n++}`);

describe('summarize (seeded Demo family, hand-computed)', () => {
  const s = summarize(items, S);
  it('gross', () => expect(s.gross).toBe(3805));
  it('insurance = 60% of (310+45+215+95)', () => { expect(s.eligible).toBe(665); expect(s.insurance).toBe(399); });
  it('offsets and net', () => { expect(s.offsets).toBe(799); expect(s.net).toBe(3006); });
  it('splits 50/30/20', () => expect(s.split.map((x) => x.amount)).toEqual([1503, 901.8, 601.2]));
  it('paid so far counts status=paid only (Ava 1680+95+45, Ben 210, Cal 310)', () => expect(s.paidBy.map((x) => x.amount)).toEqual([1820, 210, 310]));
  it('no share warning at 100', () => expect(s.shareWarning).toBe(false));
});

describe('shares', () => {
  it('normalizes by the sum and warns when != 100', () => {
    const s = summarize(items, { ...S, shares: { Ava: 1, Ben: 1, Cal: 0 } });
    expect(s.shareSum).toBe(2);
    expect(s.shareWarning).toBe(true);
    expect(s.split.map((x) => x.amount)).toEqual([1503, 1503, 0]);
    expect(s.split.map((x) => x.pct)).toEqual([50, 50, 0]);
  });
  it('all-zero shares give zero amounts', () => {
    const s = summarize(items, { ...S, shares: { Ava: 0, Ben: 0, Cal: 0 } });
    expect(s.split.every((x) => x.amount === 0)).toBe(true);
    expect(s.shareWarning).toBe(true);
  });
  it('split always sums exactly to net (largest remainder)', () => {
    const s = summarize(items, { ...S, shares: { Ava: 1, Ben: 1, Cal: 1 } });
    expect(Math.round(s.split.reduce((t, x) => t + x.amount, 0) * 100)).toBe(Math.round(s.net * 100));
    expect(allocateCents(100, [1, 1, 1])).toEqual([34, 33, 33]);
  });
});

describe('offsets', () => {
  it('rate edit changes net', () => expect(summarize(items, { ...S, insuranceRatePct: 0 }).net).toBe(3405));
  it('stipend edit changes net', () => expect(summarize(items, { ...S, stipend: 0 }).net).toBe(3406));
  it('net clamps at zero and reports unused offsets', () => {
    const s = summarize(items, { ...S, stipend: 5000 });
    expect(s.net).toBe(0);
    expect(s.unusedOffsets).toBe(5399 - 3805);
  });
  it('empty ledger', () => expect(summarize([], S).net).toBe(0));
});

describe('projection', () => {
  const p = project(3006, 3);
  it('month 1 is net, month 2 grows by g', () => { expect(p.months[0].value).toBe(3006); expect(p.months[1].value).toBe(3096.18); });
  it('cumulative matches the geometric series', () => {
    const geo = (m: number) => (3006 * (Math.pow(1.03, m) - 1)) / 0.03;
    expect(p.cumulative.m3).toBeCloseTo(geo(3), 2);
    expect(p.cumulative.m6).toBeCloseTo(geo(6), 2);
    expect(p.cumulative.m12).toBeCloseTo(geo(12), 2);
  });
  it('marks checkpoints 3, 6, 12', () => expect(p.months.filter((m) => m.checkpoint).map((m) => m.month)).toEqual([3, 6, 12]));
  it('g = 0 is flat', () => expect(project(100, 0).cumulative.m12).toBe(1200));
});

describe('flags', () => {
  const net = 3006;
  const f = computeFlags(items, net, S);
  it('days between dates', () => { expect(daysBetween('2026-10-06', '2026-11-16')).toBe(41); expect(daysBetween('2026-11-16', '2026-11-16')).toBe(0); });
  it('over budget: 3006 > 3000', () => {
    expect(f.overBudget.state).toBe('active');
    expect(f.overBudget.overBy).toBe(6);
    expect(f.overBudget.compared).toEqual({ net: 3006, budget: 3000 });
  });
  it('clear at net == budget', () => expect(computeFlags(items, 3000, S).overBudget.state).toBe('clear'));
  it('pending aging lists pending expenses dated >30 days before today (41d and 34d, not 12d)', () => {
    expect(f.pendingAging.state).toBe('active');
    expect(f.pendingAging.items.map((i) => i.ageDays)).toEqual([41, 34]);
    expect(f.pendingAging.total).toBe(860);
    expect(f.pendingAging.compared.oldestPendingDays).toBe(41);
  });
  it('exactly 30 days is not older than 30', () => {
    const it30: Item = { ...items[1], date: '2026-10-17' };
    expect(computeFlags([it30], 0, S).pendingAging.state).toBe('clear');
  });
  it('threshold is editable', () => expect(computeFlags(items, net, { ...S, pendingDaysThreshold: 40 }).pendingAging.items).toHaveLength(1));
  it('paid/planned items never trigger (old planned/paid dates are not aging)', () => expect(computeFlags(items.filter((i) => i.status !== 'pending'), net, S).pendingAging.state).toBe('clear'));
});

import { dateRange } from '../lib/calc';
describe('dateRange', () => {
  it('spans the listed expenses', () => expect(dateRange(items)?.label).toBe('Oct 6 - Nov 25, 2026'));
  it('handles year boundaries and empty', () => {
    expect(dateRange([{ ...items[0], date: '2026-12-20' }, { ...items[1], date: '2027-01-03' }])?.label).toBe('Dec 20, 2026 - Jan 3, 2027');
    expect(dateRange([])).toBeNull();
  });
});
