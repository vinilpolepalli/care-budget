import { route } from '@/lib/api';
import { buildBoard } from '@/lib/board';

export const dynamic = 'force-dynamic';

export const GET = route(false, async ({ owner, store }) => ({ flags: (await buildBoard(store, owner)).flags }));
