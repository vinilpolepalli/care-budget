import type { Item, Settings } from '../model';

export interface Store {
  /** Items for the owner, newest date first. Seeds the Demo family on an owner's first access. */
  listItems(owner: string): Promise<Item[]>;
  getItem(owner: string, id: string): Promise<Item | null>;
  createItem(owner: string, item: Omit<Item, 'id'>): Promise<Item>;
  /** null when the item does not exist for this owner (including other owners' ids). */
  updateItem(owner: string, id: string, patch: Partial<Omit<Item, 'id'>>): Promise<Item | null>;
  deleteItem(owner: string, id: string): Promise<boolean>;
  getSettings(owner: string): Promise<Settings>;
  saveSettings(owner: string, s: Settings): Promise<Settings>;
  /** Replace the owner's data with the seeded Demo family. */
  reset(owner: string): Promise<void>;
  /** Count one write in the current hour; false when over the limit. */
  allowWrite(owner: string, limit: number, now?: number): Promise<boolean>;
}

let instance: Promise<Store> | null = null;
export function getStore(): Promise<Store> {
  if (!instance) {
    instance = process.env.DATABASE_URL
      ? import('./pg').then((m) => m.createPgStore(process.env.DATABASE_URL as string))
      : import('./sqlite').then((m) => m.createSqliteStore(process.env.CAREBUDGET_DB || 'carebudget.db'));
  }
  return instance;
}
