import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { integer, primaryKey, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { DEFAULT_SETTINGS, seedItems, type Item, type Settings } from '../model';
import type { Store } from './store';

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  amountCents: integer('amount_cents').notNull(),
  payer: text('payer').notNull(),
  status: text('status').notNull(),
  date: text('date').notNull(),
  createdAt: text('created_at').notNull(),
}, (t) => [index('items_owner').on(t.ownerId)]);

export const settings = sqliteTable('settings', {
  ownerId: text('owner_id').primaryKey(),
  data: text('data').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const writeCounts = sqliteTable('write_counts', {
  ownerId: text('owner_id').notNull(),
  bucket: integer('bucket').notNull(),
  count: integer('count').notNull(),
}, (t) => [primaryKey({ columns: [t.ownerId, t.bucket] })]);

type Row = typeof items.$inferSelect;
const toItem = (r: Row): Item => ({
  id: r.id, desc: r.description, category: r.category as Item['category'], amount: r.amountCents / 100,
  payer: r.payer as Item['payer'], status: r.status as Item['status'], date: r.date,
});
const toRow = (owner: string, i: Item, createdAt: string): Row => ({
  id: i.id, ownerId: owner, description: i.desc, category: i.category, amountCents: Math.round(i.amount * 100),
  payer: i.payer, status: i.status, date: i.date, createdAt,
});

export function createSqliteStore(file: string): Store {
  const raw = new Database(file);
  raw.pragma('journal_mode = WAL');
  raw.exec(`
    CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, amount_cents INTEGER NOT NULL, payer TEXT NOT NULL, status TEXT NOT NULL, date TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS items_owner ON items(owner_id);
    CREATE TABLE IF NOT EXISTS settings (owner_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS write_counts (owner_id TEXT NOT NULL, bucket INTEGER NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(owner_id, bucket));
  `);
  const db = drizzle(raw);
  const now = () => new Date().toISOString();

  const seed = (owner: string) => {
    const t0 = Date.now();
    seedItems(randomUUID).forEach((i, k) => db.insert(items).values(toRow(owner, i, new Date(t0 + k).toISOString())).run());
  };
  // The settings row marks "owner initialised": deleting every item never re-seeds.
  const ensure = (owner: string) => db.transaction(() => {
    if (db.select().from(settings).where(eq(settings.ownerId, owner)).get()) return;
    db.insert(settings).values({ ownerId: owner, data: JSON.stringify(DEFAULT_SETTINGS), updatedAt: now() }).run();
    seed(owner);
  });
  const own = (owner: string, id: string) => and(eq(items.ownerId, owner), eq(items.id, id));

  return {
    async listItems(owner) {
      ensure(owner);
      return db.select().from(items).where(eq(items.ownerId, owner)).orderBy(desc(items.date), desc(items.createdAt), items.id).all().map(toItem);
    },
    async getItem(owner, id) {
      ensure(owner);
      const r = db.select().from(items).where(own(owner, id)).get();
      return r ? toItem(r) : null;
    },
    async createItem(owner, input) {
      ensure(owner);
      const item: Item = { ...input, id: randomUUID() };
      db.insert(items).values(toRow(owner, item, now())).run();
      return item;
    },
    async updateItem(owner, id, patch) {
      ensure(owner);
      return db.transaction(() => {
        const r = db.select().from(items).where(own(owner, id)).get();
        if (!r) return null;
        const next = { ...toItem(r), ...patch };
        db.update(items).set(toRow(owner, next, r.createdAt)).where(own(owner, id)).run();
        return next;
      });
    },
    async deleteItem(owner, id) {
      ensure(owner);
      return db.delete(items).where(own(owner, id)).run().changes > 0;
    },
    async getSettings(owner) {
      ensure(owner);
      return JSON.parse(db.select().from(settings).where(eq(settings.ownerId, owner)).get()!.data) as Settings;
    },
    async saveSettings(owner, s) {
      ensure(owner);
      db.update(settings).set({ data: JSON.stringify(s), updatedAt: now() }).where(eq(settings.ownerId, owner)).run();
      return s;
    },
    async reset(owner) {
      db.transaction(() => {
        db.delete(items).where(eq(items.ownerId, owner)).run();
        db.delete(settings).where(eq(settings.ownerId, owner)).run();
      });
      ensure(owner);
    },
    async allowWrite(owner, limit, at = Date.now()) {
      const bucket = Math.floor(at / 3_600_000);
      return db.transaction(() => {
        db.insert(writeCounts).values({ ownerId: owner, bucket, count: 0 }).onConflictDoNothing().run();
        const cur = db.select().from(writeCounts).where(and(eq(writeCounts.ownerId, owner), eq(writeCounts.bucket, bucket))).get()!;
        if (cur.count >= limit) return false;
        db.update(writeCounts).set({ count: sql`${writeCounts.count} + 1` }).where(and(eq(writeCounts.ownerId, owner), eq(writeCounts.bucket, bucket))).run();
        db.delete(writeCounts).where(sql`${writeCounts.bucket} < ${bucket}`).run();
        return true;
      });
    },
  };
}
