import { route } from '@/lib/api';
import { buildBoard } from '@/lib/board';
import { MAX_ITEMS_PER_OWNER } from '@/lib/model';
import { HttpError, parseItem } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = route(false, async ({ owner, store }) => ({ items: await store.listItems(owner) }));

export const POST = route(true, async ({ owner, store, body }) => {
  const input = parseItem(body());
  if ((await store.listItems(owner)).length >= MAX_ITEMS_PER_OWNER) throw new HttpError(409, `ledger is limited to ${MAX_ITEMS_PER_OWNER} items`);
  const item = await store.createItem(owner, input);
  return { item, board: await buildBoard(store, owner) };
});
