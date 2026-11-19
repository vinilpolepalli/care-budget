import type { computeFlags, project, summarize } from '@/lib/calc';
import type { Item, Settings } from '@/lib/model';

/** Shape returned by GET /api/summary and embedded as `board` in write responses. */
export interface BoardData {
  today: string;
  /** date span of the listed expenses; null when the ledger is empty */
  range: { from: string; to: string; label: string } | null;
  notice: string;
  offsetNotice: string;
  insuranceCategories: string[];
  settings: Settings;
  items: Item[];
  summary: ReturnType<typeof summarize>;
  projection: ReturnType<typeof project>;
  flags: ReturnType<typeof computeFlags>;
}
