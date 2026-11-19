import { route } from '@/lib/api';
import { buildBoard } from '@/lib/board';

export const dynamic = 'force-dynamic';

export const GET = route(false, async ({ owner, store }) => {
  const b = await buildBoard(store, owner);
  return { net: b.summary.net, projection: b.projection };
});
