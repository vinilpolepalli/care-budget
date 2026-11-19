// Pure calc core: gross, offsets, net, split normalization, projection, flags.
// No I/O, no clock, no randomness. Money is rounded to cents at each published figure.
import { INSURANCE_CATEGORIES, MEMBERS, TODAY, type Item, type Member, type Settings } from './model';

const cents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const usd = (n: number) =>
  (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Whole days from ISO date a to ISO date b (b - a). Date-only, UTC, so DST cannot skew it. */
export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

/** Split `totalCents` by weights using largest-remainder so the parts sum exactly to the total. */
export function allocateCents(totalCents: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0 || totalCents <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (totalCents * w) / sum);
  const out = exact.map(Math.floor);
  let left = totalCents - out.reduce((s, v) => s + v, 0);
  const order = exact.map((e, i) => ({ i, frac: e - Math.floor(e) })).sort((x, y) => y.frac - x.frac || x.i - y.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

export interface SplitRow { member: Member; share: number; pct: number; amount: number }
export interface Summary {
  gross: number;
  /** Medications + Medical supplies spend the insurance rate applies to */
  eligible: number;
  insurance: number;
  stipend: number;
  offsets: number;
  /** max(gross - offsets, 0) */
  net: number;
  /** offsets beyond gross that could not reduce net below zero */
  unusedOffsets: number;
  shareSum: number;
  /** true when shares do not sum to 100 (they are still normalized by the sum) */
  shareWarning: boolean;
  split: SplitRow[];
  /** Per member: sum of items with status 'paid' only (pending and planned excluded) */
  paidBy: { member: Member; amount: number }[];
}

export function summarize(items: readonly Item[], s: Settings): Summary {
  const grossC = items.reduce((t, i) => t + cents(i.amount), 0);
  const eligibleC = items.filter((i) => INSURANCE_CATEGORIES.includes(i.category)).reduce((t, i) => t + cents(i.amount), 0);
  const insuranceC = Math.round((eligibleC * s.insuranceRatePct) / 100);
  const stipendC = cents(s.stipend);
  const offsetsC = insuranceC + stipendC;
  const netC = Math.max(grossC - offsetsC, 0);
  const weights = MEMBERS.map((m) => s.shares[m]);
  const shareSum = weights.reduce((t, w) => t + w, 0);
  const parts = allocateCents(netC, weights);
  return {
    gross: fromCents(grossC),
    eligible: fromCents(eligibleC),
    insurance: fromCents(insuranceC),
    stipend: fromCents(stipendC),
    offsets: fromCents(offsetsC),
    net: fromCents(netC),
    unusedOffsets: fromCents(Math.max(offsetsC - grossC, 0)),
    shareSum,
    shareWarning: Math.abs(shareSum - 100) > 1e-9,
    split: MEMBERS.map((member, k) => ({
      member,
      share: s.shares[member],
      pct: shareSum > 0 ? (s.shares[member] / shareSum) * 100 : 0,
      amount: fromCents(parts[k]),
    })),
    paidBy: MEMBERS.map((member) => ({
      member,
      amount: fromCents(items.filter((i) => i.payer === member && i.status === 'paid').reduce((t, i) => t + cents(i.amount), 0)),
    })),
  };
}

export interface ProjectionMonth { month: number; value: number; cumulative: number; checkpoint: boolean }
export interface Projection {
  formula: string;
  growthPct: number;
  months: ProjectionMonth[];
  cumulative: { m3: number; m6: number; m12: number };
}

export const CHECKPOINTS = [3, 6, 12] as const;

/** month m = net * (1 + g)^(m-1); cumulative sums the unrounded values, then rounds. */
export function project(net: number, growthPct: number): Projection {
  const g = growthPct / 100;
  let cum = 0;
  const months = Array.from({ length: 12 }, (_, k) => {
    const raw = net * Math.pow(1 + g, k);
    cum += raw;
    const month = k + 1;
    return { month, value: round2(raw), cumulative: round2(cum), checkpoint: (CHECKPOINTS as readonly number[]).includes(month) };
  });
  const at = (m: number) => months[m - 1].cumulative;
  return {
    formula: 'listed net x (1 + g)^(m - 1), g = monthly growth',
    growthPct,
    months,
    cumulative: { m3: at(3), m6: at(6), m12: at(12) },
  };
}

export interface AgingItem { id: string; desc: string; amount: number; date: string; ageDays: number }
export interface Flags {
  today: string;
  overBudget: {
    id: 'OVER_BUDGET';
    state: 'active' | 'clear';
    rule: string;
    threshold: number;
    compared: { net: number; budget: number };
    overBy: number;
  };
  pendingAging: {
    id: 'PENDING_EXPENSES_AGING';
    label: 'PENDING EXPENSES AGING';
    state: 'active' | 'clear';
    rule: string;
    threshold: number;
    compared: { oldestPendingDays: number | null; thresholdDays: number };
    items: AgingItem[];
    total: number;
  };
}

export function computeFlags(items: readonly Item[], net: number, s: Settings, today: string = TODAY): Flags {
  const pending = items
    .filter((i) => i.status === 'pending')
    .map((i) => ({ id: i.id, desc: i.desc, amount: i.amount, date: i.date, ageDays: daysBetween(i.date, today) }));
  const aging = pending.filter((i) => i.ageDays > s.pendingDaysThreshold).sort((a, b) => b.ageDays - a.ageDays || a.id.localeCompare(b.id));
  const oldest = pending.length ? Math.max(...pending.map((p) => p.ageDays)) : null;
  const over = net > s.budget;
  return {
    today,
    overBudget: {
      id: 'OVER_BUDGET',
      state: over ? 'active' : 'clear',
      rule: 'active when listed net out-of-pocket > monthly budget (the listed expenses are compared against the budget; they are not claimed to be a calendar month)',
      threshold: s.budget,
      compared: { net, budget: s.budget },
      overBy: over ? round2(net - s.budget) : 0,
    },
    pendingAging: {
      id: 'PENDING_EXPENSES_AGING',
      label: 'PENDING EXPENSES AGING',
      state: aging.length ? 'active' : 'clear',
      rule: `active when any expense with status pending is dated more than ${s.pendingDaysThreshold} days before the demo today (${today}); based on expense date and payment status only`,
      threshold: s.pendingDaysThreshold,
      compared: { oldestPendingDays: oldest, thresholdDays: s.pendingDaysThreshold },
      items: aging,
      total: fromCents(aging.reduce((t, i) => t + cents(i.amount), 0)),
    },
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

/** Earliest and latest expense date as a label, e.g. "Oct 6 - Nov 25, 2026"; null for an empty ledger. */
export function dateRange(items: readonly Item[]): { from: string; to: string; label: string } | null {
  if (!items.length) return null;
  const dates = items.map((i) => i.date).sort();
  const from = dates[0];
  const to = dates[dates.length - 1];
  const label = from.slice(0, 4) === to.slice(0, 4)
    ? `${fmtDay(from)} - ${fmtDay(to)}, ${to.slice(0, 4)}`
    : `${fmtDay(from)}, ${from.slice(0, 4)} - ${fmtDay(to)}, ${to.slice(0, 4)}`;
  return { from, to, label };
}
