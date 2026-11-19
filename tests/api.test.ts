import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';

const dir = mkdtempSync(join(tmpdir(), 'cb-'));
process.env.CAREBUDGET_DB = join(dir, 'test.db');
type H = (req: NextRequest, p?: unknown) => Promise<Response>;
let m: Record<string, Record<string, H>>;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function req(path: string, method = 'GET', body?: unknown, cookie?: string, extra: Record<string, string> = {}) {
  const raw = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest(`http://localhost${path}`, {
    method, body: raw, headers: { host: 'localhost', ...(cookie ? { cookie: `cb_uid=${cookie}` } : {}), ...extra },
  });
}
const uid = (r: Response) => /cb_uid=([^;]+)/.exec(r.headers.get('set-cookie') ?? '')?.[1] as string;
const newItem = { desc: 'Test rides', category: 'Transport', amount: 100, payer: 'Cal', status: 'paid', date: '2026-11-10' };

beforeAll(async () => {
  m = {
    ledger: await import('../app/api/ledger/route'), item: await import('../app/api/ledger/[id]/route'),
    summary: await import('../app/api/summary/route'), settings: await import('../app/api/settings/route'),
    offsets: await import('../app/api/offsets/route'), projection: await import('../app/api/projection/route'),
    flags: await import('../app/api/flags/route'), reset: await import('../app/api/reset/route'),
  } as never;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function visitor() {
  const r = await m.summary.GET(req('/api/summary'));
  return { id: uid(r), board: await r.json() };
}

describe('api', () => {
  it('fresh visitor gets cookie + seeded board', async () => {
    const r = await m.summary.GET(req('/api/summary'));
    expect(r.headers.get('set-cookie')).toMatch(/cb_uid=.*HttpOnly/i);
    const b = await r.json();
    expect(b.items).toHaveLength(10);
    expect(b.summary).toMatchObject({ gross: 3805, insurance: 399, offsets: 799, net: 3006 });
    expect(b.flags.overBudget.state).toBe('active');
    expect(b.flags.pendingAging.items).toHaveLength(2);
  });

  it('ledger CRUD updates summary, projection and flags', async () => {
    const { id } = await visitor();
    const c = await m.ledger.POST(req('/api/ledger', 'POST', newItem, id));
    const created = await c.json();
    expect(created.board.summary.gross).toBe(3905);
    expect(created.board.summary.net).toBe(3106);
    expect(created.board.projection.months[0].value).toBe(3106);
    const itemId = created.item.id;
    const u = await (await m.item.PATCH(req(`/api/ledger/${itemId}`, 'PATCH', { amount: 50, category: 'Medications' }, id), ctx(itemId))).json();
    expect(u.board.summary.gross).toBe(3855);
    expect(u.board.summary.insurance).toBe(429); // (665+50)*0.6
    const d = await (await m.item.DELETE(req(`/api/ledger/${itemId}`, 'DELETE', undefined, id), ctx(itemId))).json();
    expect(d.board.summary.net).toBe(3006);
    expect((await m.item.GET(req(`/api/ledger/${itemId}`, 'GET', undefined, id), ctx(itemId))).status).toBe(404);
  });

  it('deleting the pending items clears PENDING EXPENSES AGING', async () => {
    const { id, board } = await visitor();
    for (const i of board.items.filter((x: { status: string }) => x.status === 'pending')) await m.item.DELETE(req('/x', 'DELETE', undefined, id), ctx(i.id));
    const f = await (await m.flags.GET(req('/api/flags', 'GET', undefined, id))).json();
    expect(f.flags.pendingAging.state).toBe('clear');
  });

  it('settings: shares normalize + warn, rate changes net, bad values 400', async () => {
    const { id } = await visitor();
    const s = await (await m.settings.PATCH(req('/api/settings', 'PATCH', { shares: { Ava: 1, Ben: 1, Cal: 0 }, growthPct: 5 }, id))).json();
    expect(s.board.summary.shareSum).toBe(2);
    expect(s.board.summary.shareWarning).toBe(true);
    expect(s.board.summary.split[0].amount).toBe(1503);
    expect(s.board.projection.growthPct).toBe(5);
    const o = await (await m.offsets.PATCH(req('/api/offsets', 'PATCH', { insuranceRatePct: 0 }, id))).json();
    expect(o.board.summary.net).toBe(3405);
    expect((await (await m.offsets.GET(req('/api/offsets', 'GET', undefined, id))).json()).insurance).toBe(0);
    expect((await m.settings.PATCH(req('/api/settings', 'PATCH', { insuranceRatePct: 101 }, id))).status).toBe(400);
    expect((await m.offsets.PATCH(req('/api/offsets', 'PATCH', { budget: 5 }, id))).status).toBe(400);
  });

  it('projection endpoint', async () => {
    const { id } = await visitor();
    const p = await (await m.projection.GET(req('/api/projection', 'GET', undefined, id))).json();
    expect(p.projection.months).toHaveLength(12);
    expect(p.projection.cumulative.m3).toBeCloseTo(3006 * (Math.pow(1.03, 3) - 1) / 0.03, 2);
  });

  it('owner isolation: other owner cannot read or change my item; edits are private', async () => {
    const a = await visitor();
    const b = await visitor();
    const target = a.board.items[0].id;
    expect((await m.item.GET(req('/x', 'GET', undefined, b.id), ctx(target))).status).toBe(404);
    expect((await m.item.PATCH(req('/x', 'PATCH', { amount: 1 }, b.id), ctx(target))).status).toBe(404);
    expect((await m.item.DELETE(req('/x', 'DELETE', undefined, b.id), ctx(target))).status).toBe(404);
    await m.settings.PATCH(req('/api/settings', 'PATCH', { budget: 1234 }, a.id));
    const bs = await (await m.settings.GET(req('/api/settings', 'GET', undefined, b.id))).json();
    expect(bs.settings.budget).toBe(3000);
    const still = await (await m.item.GET(req('/x', 'GET', undefined, a.id), ctx(target))).json();
    expect(still.item.amount).toBe(a.board.items[0].amount);
  });

  it('reset restores the seeded dataset', async () => {
    const { id } = await visitor();
    await m.settings.PATCH(req('/api/settings', 'PATCH', { budget: 1 }, id));
    const r = await (await m.reset.POST(req('/api/reset', 'POST', undefined, id))).json();
    expect(r.board.settings.budget).toBe(3000);
    expect(r.board.items).toHaveLength(10);
  });

  it('rejects invalid body, bad JSON, oversize (413), cross-origin (403)', async () => {
    const { id } = await visitor();
    expect((await m.ledger.POST(req('/api/ledger', 'POST', { ...newItem, amount: -1 }, id))).status).toBe(400);
    expect((await m.ledger.POST(req('/api/ledger', 'POST', '{nope', id))).status).toBe(400);
    expect((await m.ledger.POST(req('/api/ledger', 'POST', { ...newItem, desc: 'x'.repeat(21_000) }, id))).status).toBe(413);
    expect((await m.ledger.POST(req('/api/ledger', 'POST', newItem, id, { origin: 'http://evil.example' }))).status).toBe(403);
    expect((await m.ledger.POST(req('/api/ledger', 'POST', newItem, id, { origin: 'null' }))).status).toBe(403);
  });

  it('rate limit: 120 writes/hour then 429; reads and other owners unaffected', async () => {
    const { id } = await visitor();
    const other = await visitor();
    let last = 0;
    let firstBlocked = 0;
    for (let i = 1; i <= 125; i++) {
      last = (await m.settings.PATCH(req('/api/settings', 'PATCH', { budget: 1000 + i }, id))).status;
      if (last === 429 && !firstBlocked) firstBlocked = i;
    }
    expect(firstBlocked).toBe(121);
    expect((await m.summary.GET(req('/api/summary', 'GET', undefined, id))).status).toBe(200);
    expect((await m.settings.PATCH(req('/api/settings', 'PATCH', { budget: 5 }, other.id))).status).toBe(200);
  });

  it('caps ledger size at 200 (409)', async () => {
    const { id } = await visitor();
    const { getStore } = await import('../lib/db/store');
    const store = await getStore();
    for (let i = 0; i < 190; i++) await store.createItem(id, newItem as never); // direct: the write limit would stop 190 API calls
    expect((await m.ledger.POST(req('/api/ledger', 'POST', newItem, id))).status).toBe(409);
  });
});
