import { route } from '@/lib/api';
import { buildBoard } from '@/lib/board';

export const dynamic = 'force-dynamic';

/** Restore this owner's data to the seeded Demo family. */
export const POST = route(true, async ({ owner, store }) => {
  await store.reset(owner);
  return { board: await buildBoard(store, owner) };
});
