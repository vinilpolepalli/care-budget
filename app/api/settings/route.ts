import { route } from '@/lib/api';
import { buildBoard } from '@/lib/board';
import { parseSettingsPatch } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = route(false, async ({ owner, store }) => ({ settings: await store.getSettings(owner) }));

/** Partial update: budget, shares, insuranceRatePct, stipend, growthPct, pendingDaysThreshold. */
export const PATCH = route(true, async ({ owner, store, body }) => {
  const next = parseSettingsPatch(body(), await store.getSettings(owner));
  await store.saveSettings(owner, next);
  return { board: await buildBoard(store, owner) };
});
