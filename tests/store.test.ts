import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSqliteStore } from '../lib/db/sqlite';

const file = () => join(mkdtempSync(join(tmpdir(), 'cb-store-')), 's.db');

describe('sqlite store', () => {
  it('persists across reopen', async () => {
    const f = file();
    const a = createSqliteStore(f);
    const it = await a.createItem('o1', { desc: 'persist me', category: 'Transport', amount: 12.34, payer: 'Ben', status: 'planned', date: '2026-11-11' });
    await a.saveSettings('o1', { ...(await a.getSettings('o1')), budget: 4321 });
    const b = createSqliteStore(f);
    expect((await b.getItem('o1', it.id))?.amount).toBe(12.34);
    expect((await b.getSettings('o1')).budget).toBe(4321);
    expect(await b.listItems('o1')).toHaveLength(11);
  });
  it('does not reseed after deleting everything', async () => {
    const s = createSqliteStore(file());
    for (const i of await s.listItems('o')) await s.deleteItem('o', i.id);
    expect(await s.listItems('o')).toHaveLength(0);
  });
  it('allowWrite counts per owner per hour bucket', async () => {
    const s = createSqliteStore(file());
    const t = 10 * 3_600_000;
    expect([await s.allowWrite('a', 2, t), await s.allowWrite('a', 2, t), await s.allowWrite('a', 2, t)]).toEqual([true, true, false]);
    expect(await s.allowWrite('b', 2, t)).toBe(true);
    expect(await s.allowWrite('a', 2, t + 3_600_000)).toBe(true);
  });
});
