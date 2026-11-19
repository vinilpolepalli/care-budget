import { route } from '@/lib/api';
import { buildBoard } from '@/lib/board';
import { HttpError, parseItemPatch } from '@/lib/validate';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ id: string }> };

export const GET = async (req: NextRequest, p: P) => {
  const { id } = await p.params;
  return route(false, async ({ owner, store }) => {
    const item = await store.getItem(owner, id);
    if (!item) throw new HttpError(404, 'item not found');
    return { item };
  })(req);
};

export const PATCH = async (req: NextRequest, p: P) => {
  const { id } = await p.params;
  return route(true, async ({ owner, store, body }) => {
    const patch = parseItemPatch(body());
    const item = await store.updateItem(owner, id, patch);
    if (!item) throw new HttpError(404, 'item not found');
    return { item, board: await buildBoard(store, owner) };
  })(req);
};

export const DELETE = async (req: NextRequest, p: P) => {
  const { id } = await p.params;
  return route(true, async ({ owner, store }) => {
    if (!(await store.deleteItem(owner, id))) throw new HttpError(404, 'item not found');
    return { deleted: id, board: await buildBoard(store, owner) };
  })(req);
};
