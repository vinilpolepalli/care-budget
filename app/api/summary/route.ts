import { route } from '@/lib/api';
import { buildBoard } from '@/lib/board';

export const dynamic = 'force-dynamic';

/** Full board: items, settings, summary, projection, flags. */
export const GET = route(false, ({ owner, store }) => buildBoard(store, owner));
