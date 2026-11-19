import { computeFlags, dateRange, project, summarize } from './calc';
import type { Store } from './db/store';
import { INSURANCE_CATEGORIES, TODAY } from './model';

export const DEMO_NOTICE = 'Sample data - demo. Every person, expense and benefit is synthetic; the math is a fixed-formula illustration, not financial advice.';
export const OFFSET_NOTICE = 'Illustrative offsets only. They mirror the class of programs (insurance reimbursement, state caregiving stipends such as Michigan Home Help) that agencies like Cova help families enroll in. No real enrollment or eligibility is implied.';

/** Everything the board shows, computed server-side from the owner's stored data. */
export async function buildBoard(store: Store, owner: string) {
  const [items, settings] = await Promise.all([store.listItems(owner), store.getSettings(owner)]);
  const summary = summarize(items, settings);
  return {
    today: TODAY,
    range: dateRange(items),
    notice: DEMO_NOTICE,
    offsetNotice: OFFSET_NOTICE,
    insuranceCategories: INSURANCE_CATEGORIES,
    settings,
    items,
    summary,
    projection: project(summary.net, settings.growthPct),
    flags: computeFlags(items, summary.net, settings),
  };
}
