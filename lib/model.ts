// Shared types, constants and the seeded Demo family dataset. No I/O here.

export const MEMBERS = ['Ava', 'Ben', 'Cal'] as const;
export type Member = (typeof MEMBERS)[number];

export const CATEGORIES = ['Caregiver hours', 'Medical supplies', 'Transport', 'Home modifications', 'Medications'] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ['paid', 'pending', 'planned'] as const;
export type Status = (typeof STATUSES)[number];

/** Categories the illustrative insurance reimbursement applies to. Fixed; the rate is editable. */
export const INSURANCE_CATEGORIES: readonly Category[] = ['Medications', 'Medical supplies'];

/** Fixed demo "today" so every output is deterministic (no Date.now). */
export const TODAY = '2026-11-16';

export interface Item {
  id: string;
  desc: string;
  category: Category;
  /** USD, at most 2 decimals, > 0 */
  amount: number;
  payer: Member;
  status: Status;
  /** ISO date YYYY-MM-DD of the expense */
  date: string;
}

/** Per-owner editable constants. Every threshold and rate used by the calc core lives here. */
export interface Settings {
  budget: number;
  shares: Record<Member, number>;
  /** Illustrative insurance reimbursement, percent of Medications + Medical supplies */
  insuranceRatePct: number;
  /** Illustrative flat state caregiving stipend, USD per month */
  stipend: number;
  /** Monthly growth of net cost used by the projection, percent */
  growthPct: number;
  /** PENDING EXPENSES AGING fires for pending-status expenses dated more than this many days before today */
  pendingDaysThreshold: number;
}

export const DEFAULT_SETTINGS: Settings = {
  budget: 3000,
  shares: { Ava: 50, Ben: 30, Cal: 20 },
  insuranceRatePct: 60,
  stipend: 400,
  growthPct: 3,
  pendingDaysThreshold: 30,
};

export const MAX_ITEMS_PER_OWNER = 200;

type Seed = Omit<Item, 'id'>;
const SEED: Seed[] = [
  { desc: 'Home aide, 60 hrs @ $28', category: 'Caregiver hours', amount: 1680, payer: 'Ava', status: 'paid', date: '2026-11-02' },
  { desc: 'Weekend respite aide, 16 hrs @ $30', category: 'Caregiver hours', amount: 480, payer: 'Ben', status: 'pending', date: '2026-10-06' },
  { desc: 'Incontinence & wound-care supplies', category: 'Medical supplies', amount: 215, payer: 'Cal', status: 'pending', date: '2026-11-04' },
  { desc: 'Blood pressure monitor & test strips', category: 'Medical supplies', amount: 95, payer: 'Ava', status: 'paid', date: '2026-11-08' },
  { desc: 'Medical appointment rides (6 trips)', category: 'Transport', amount: 210, payer: 'Ben', status: 'paid', date: '2026-11-10' },
  { desc: 'Accessible van rental, specialist visit', category: 'Transport', amount: 140, payer: 'Cal', status: 'planned', date: '2026-11-20' },
  { desc: 'Bathroom grab bars install', category: 'Home modifications', amount: 380, payer: 'Ava', status: 'pending', date: '2026-10-13' },
  { desc: 'Stair rail extension (deposit)', category: 'Home modifications', amount: 250, payer: 'Ben', status: 'planned', date: '2026-11-25' },
  { desc: 'Monthly prescriptions (5 meds)', category: 'Medications', amount: 310, payer: 'Cal', status: 'paid', date: '2026-11-03' },
  { desc: 'Pharmacy pill organizer service', category: 'Medications', amount: 45, payer: 'Ava', status: 'paid', date: '2026-11-05' },
];

/** The Demo family dataset a fresh owner starts with. Ids are supplied by the caller. */
export function seedItems(newId: () => string): Item[] {
  return SEED.map((s) => ({ ...s, id: newId() }));
}
