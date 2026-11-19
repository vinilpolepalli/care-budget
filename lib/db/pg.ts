import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { DEFAULT_SETTINGS, seedItems, type Item, type Settings } from '../model';
import type { Store } from './store';

// Postgres implementation for production (DATABASE_URL). Same tables and semantics as the SQLite store.
// NOT exercised against a live Postgres in this repo's verification (see IMPLEMENTATION.md).
type Row = { id: string; description: string; category: string; amount_cents: number; payer: string; status: string; date: string };
const toItem = (r: Row): Item => ({
  id: r.id, desc: r.description, category: r.category as Item['category'], amount: Number(r.amount_cents) / 100,
  payer: r.payer as Item['payer'], status: r.status as Item['status'], date: r.date,
});

export async function createPgStore(url: string): Promise<Store> {
  const pool = new Pool({ connectionString: url });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, amount_cents INTEGER NOT NULL, payer TEXT NOT NULL, status TEXT NOT NULL, date TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS items_owner ON items(owner_id);
    CREATE TABLE IF NOT EXISTS settings (owner_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS write_counts (owner_id TEXT NOT NULL, bucket BIGINT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(owner_id, bucket));
  `);
  const now = () => new Date().toISOString();

  async function ensure(owner: string) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const ins = await c.query('INSERT INTO settings (owner_id, data, updated_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [owner, JSON.stringify(DEFAULT_SETTINGS), now()]);
      if (ins.rowCount) {
        const t0 = Date.now();
        for (const [k, i] of seedItems(randomUUID).entries()) {
          await c.query('INSERT INTO items (id, owner_id, description, category, amount_cents, payer, status, date, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [i.id, owner, i.desc, i.category, Math.round(i.amount * 100), i.payer, i.status, i.date, new Date(t0 + k).toISOString()]);
        }
      }
      await c.query('COMMIT');
    } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }

  return {
    async listItems(owner) {
      await ensure(owner);
      return (await pool.query<Row>('SELECT * FROM items WHERE owner_id=$1 ORDER BY date DESC, created_at DESC, id', [owner])).rows.map(toItem);
    },
    async getItem(owner, id) {
      await ensure(owner);
      const r = await pool.query<Row>('SELECT * FROM items WHERE owner_id=$1 AND id=$2', [owner, id]);
      return r.rows[0] ? toItem(r.rows[0]) : null;
    },
    async createItem(owner, input) {
      await ensure(owner);
      const item: Item = { ...input, id: randomUUID() };
      await pool.query('INSERT INTO items (id, owner_id, description, category, amount_cents, payer, status, date, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [item.id, owner, item.desc, item.category, Math.round(item.amount * 100), item.payer, item.status, item.date, now()]);
      return item;
    },
    async updateItem(owner, id, patch) {
      await ensure(owner);
      const found = await pool.query<Row>('SELECT * FROM items WHERE owner_id=$1 AND id=$2', [owner, id]);
      if (!found.rows[0]) return null;
      const cur = toItem(found.rows[0]);
      const n = { ...cur, ...patch };
      await pool.query('UPDATE items SET description=$3, category=$4, amount_cents=$5, payer=$6, status=$7, date=$8 WHERE owner_id=$1 AND id=$2',
        [owner, id, n.desc, n.category, Math.round(n.amount * 100), n.payer, n.status, n.date]);
      return n;
    },
    async deleteItem(owner, id) {
      await ensure(owner);
      return ((await pool.query('DELETE FROM items WHERE owner_id=$1 AND id=$2', [owner, id])).rowCount ?? 0) > 0;
    },
    async getSettings(owner) {
      await ensure(owner);
      return JSON.parse((await pool.query<{ data: string }>('SELECT data FROM settings WHERE owner_id=$1', [owner])).rows[0].data) as Settings;
    },
    async saveSettings(owner, s) {
      await ensure(owner);
      await pool.query('UPDATE settings SET data=$2, updated_at=$3 WHERE owner_id=$1', [owner, JSON.stringify(s), now()]);
      return s;
    },
    async reset(owner) {
      await pool.query('DELETE FROM items WHERE owner_id=$1', [owner]);
      await pool.query('DELETE FROM settings WHERE owner_id=$1', [owner]);
      await ensure(owner);
    },
    async allowWrite(owner, limit, at = Date.now()) {
      const bucket = Math.floor(at / 3_600_000);
      const r = await pool.query(
        `INSERT INTO write_counts (owner_id, bucket, count) VALUES ($1,$2,1)
         ON CONFLICT (owner_id, bucket) DO UPDATE SET count = write_counts.count + 1 WHERE write_counts.count < $3 RETURNING count`,
        [owner, bucket, limit]);
      return (r.rowCount ?? 0) > 0;
    },
  };
}
