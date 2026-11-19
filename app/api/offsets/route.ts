import { route } from '@/lib/api';
import { buildBoard } from '@/lib/board';
import { OFFSET_KEYS, parseSettingsPatch } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = route(false, async ({ owner, store }) => {
  const b = await buildBoard(store, owner);
  const { eligible, insurance, stipend, offsets } = b.summary;
  return {
    notice: b.offsetNotice,
    insuranceCategories: b.insuranceCategories,
    insuranceRatePct: b.settings.insuranceRatePct,
    eligible, insurance, stipend, offsets,
  };
});

/** Edit only the two offset parameters: insuranceRatePct (0-100) and stipend (USD/month). */
export const PATCH = route(true, async ({ owner, store, body }) => {
  const next = parseSettingsPatch(body(), await store.getSettings(owner), OFFSET_KEYS);
  await store.saveSettings(owner, next);
  return { board: await buildBoard(store, owner) };
});
