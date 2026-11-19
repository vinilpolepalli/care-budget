import { CATEGORIES, MEMBERS, STATUSES, type Category, type Item, type Member, type Settings, type Status } from './model';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const bad = (m: string) => new HttpError(400, m);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const LIMITS = {
  amount: [0.01, 100_000], budget: [0, 1_000_000], share: [0, 100], ratePct: [0, 100],
  stipend: [0, 100_000], growthPct: [0, 10], thresholdDays: [1, 365], descLen: 120,
} as const;

function num(v: unknown, name: string, [min, max]: readonly [number, number]): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw bad(`${name} must be a number`);
  if (v < min || v > max) throw bad(`${name} must be between ${min} and ${max}`);
  return v;
}
function money(v: unknown, name: string, lim: readonly [number, number]): number {
  const n = num(v, name, lim);
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) throw bad(`${name} must have at most 2 decimals`);
  return Math.round(n * 100) / 100;
}
function only(o: Record<string, unknown>, keys: readonly string[], name: string) {
  for (const k of Object.keys(o)) if (!keys.includes(k)) throw bad(`${name}: unknown field ${k}`);
}
function oneOf<T extends string>(v: unknown, set: readonly T[], name: string): T {
  if (typeof v !== 'string' || !set.includes(v as T)) throw bad(`${name} must be one of: ${set.join(', ')}`);
  return v as T;
}

export function parseDate(v: unknown): string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw bad('date must be YYYY-MM-DD');
  const [y, m, d] = v.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) throw bad('date is not a real calendar date');
  if (y < 2000 || y > 2100) throw bad('date must be between 2000 and 2100');
  return v;
}
function parseDesc(v: unknown): string {
  if (typeof v !== 'string') throw bad('desc must be a string');
  const s = v.trim();
  if (s.length < 1 || s.length > LIMITS.descLen) throw bad(`desc must be 1-${LIMITS.descLen} characters`);
  if (/[\u0000-\u001f\u007f]/.test(s)) throw bad('desc must not contain control characters');
  return s;
}

const ITEM_KEYS = ['desc', 'category', 'amount', 'payer', 'status', 'date'] as const;
type ItemInput = Omit<Item, 'id'>;

export function parseItem(v: unknown): ItemInput {
  if (!isObj(v)) throw bad('item must be an object');
  only(v, ITEM_KEYS, 'item');
  for (const k of ITEM_KEYS) if (!(k in v)) throw bad(`item: missing ${k}`);
  return {
    desc: parseDesc(v.desc), category: oneOf<Category>(v.category, CATEGORIES, 'category'),
    amount: money(v.amount, 'amount', LIMITS.amount), payer: oneOf<Member>(v.payer, MEMBERS, 'payer'),
    status: oneOf<Status>(v.status, STATUSES, 'status'), date: parseDate(v.date),
  };
}

export function parseItemPatch(v: unknown): Partial<ItemInput> {
  if (!isObj(v)) throw bad('patch must be an object');
  only(v, ITEM_KEYS, 'item');
  const out: Partial<ItemInput> = {};
  if ('desc' in v) out.desc = parseDesc(v.desc);
  if ('category' in v) out.category = oneOf<Category>(v.category, CATEGORIES, 'category');
  if ('amount' in v) out.amount = money(v.amount, 'amount', LIMITS.amount);
  if ('payer' in v) out.payer = oneOf<Member>(v.payer, MEMBERS, 'payer');
  if ('status' in v) out.status = oneOf<Status>(v.status, STATUSES, 'status');
  if ('date' in v) out.date = parseDate(v.date);
  if (!Object.keys(out).length) throw bad('patch must change at least one field');
  return out;
}

export const OFFSET_KEYS = ['insuranceRatePct', 'stipend'] as const;
export const SETTING_KEYS = ['budget', 'shares', ...OFFSET_KEYS, 'growthPct', 'pendingDaysThreshold'] as const;

/** Partial settings update merged over `cur`; every present field is range-checked. */
export function parseSettingsPatch(v: unknown, cur: Settings, allowed: readonly string[] = SETTING_KEYS): Settings {
  if (!isObj(v)) throw bad('settings must be an object');
  only(v, allowed, 'settings');
  if (!Object.keys(v).length) throw bad('settings patch must change at least one field');
  const next: Settings = { ...cur, shares: { ...cur.shares } };
  if ('budget' in v) next.budget = money(v.budget, 'budget', LIMITS.budget);
  if ('insuranceRatePct' in v) next.insuranceRatePct = num(v.insuranceRatePct, 'insuranceRatePct', LIMITS.ratePct);
  if ('stipend' in v) next.stipend = money(v.stipend, 'stipend', LIMITS.stipend);
  if ('growthPct' in v) next.growthPct = num(v.growthPct, 'growthPct', LIMITS.growthPct);
  if ('pendingDaysThreshold' in v) {
    const d = num(v.pendingDaysThreshold, 'pendingDaysThreshold', LIMITS.thresholdDays);
    if (!Number.isInteger(d)) throw bad('pendingDaysThreshold must be a whole number');
    next.pendingDaysThreshold = d;
  }
  if ('shares' in v) {
    if (!isObj(v.shares)) throw bad('shares must be an object');
    only(v.shares, MEMBERS, 'shares');
    for (const m of MEMBERS) if (m in v.shares) next.shares[m] = num(v.shares[m], `shares.${m}`, LIMITS.share);
  }
  return next;
}
