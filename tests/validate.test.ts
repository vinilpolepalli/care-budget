import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS as S } from '../lib/model';
import { HttpError, parseDate, parseItem, parseItemPatch, parseSettingsPatch } from '../lib/validate';

const ok = { desc: 'Aide', category: 'Transport', amount: 10.5, payer: 'Ava', status: 'paid', date: '2026-11-01' };
const rejects = (f: () => unknown) => expect(f).toThrow(HttpError);

describe('parseItem', () => {
  it('accepts a valid item', () => expect(parseItem(ok)).toEqual(ok));
  it('trims desc', () => expect(parseItem({ ...ok, desc: '  x ' }).desc).toBe('x'));
  for (const [name, bad] of Object.entries({
    zero: { amount: 0 }, negative: { amount: -5 }, huge: { amount: 100_001 }, nan: { amount: NaN }, string: { amount: '5' },
    sub_cent: { amount: 1.005 }, empty_desc: { desc: '   ' }, long_desc: { desc: 'x'.repeat(121) }, ctrl: { desc: 'a\u0000b' },
    category: { category: 'Food' }, payer: { payer: 'Dan' }, status: { status: 'done' }, date: { date: '2026-02-30' }, date_fmt: { date: '11/01/2026' },
    extra: { id: 'x' },
  })) it(`rejects ${name}`, () => rejects(() => parseItem({ ...ok, ...bad })));
  it('rejects missing field', () => { const { payer: _p, ...rest } = ok; rejects(() => parseItem(rest)); });
  it('rejects non-object', () => { rejects(() => parseItem(null)); rejects(() => parseItem([])); });
});

describe('parseItemPatch', () => {
  it('accepts partial', () => expect(parseItemPatch({ status: 'paid' })).toEqual({ status: 'paid' }));
  it('rejects empty and invalid', () => { rejects(() => parseItemPatch({})); rejects(() => parseItemPatch({ amount: -1 })); });
});

describe('parseSettingsPatch', () => {
  it('merges partial shares', () => expect(parseSettingsPatch({ shares: { Ava: 10 } }, S).shares).toEqual({ Ava: 10, Ben: 30, Cal: 20 }));
  it('allows shares not summing to 100', () => expect(parseSettingsPatch({ shares: { Ava: 90, Ben: 90, Cal: 90 } }, S).shares.Cal).toBe(90));
  for (const [name, bad] of Object.entries({
    share_neg: { shares: { Ava: -1 } }, share_101: { shares: { Ava: 101 } }, share_member: { shares: { Dan: 1 } },
    rate_101: { insuranceRatePct: 101 }, rate_neg: { insuranceRatePct: -1 }, growth_11: { growthPct: 11 }, budget_neg: { budget: -1 },
    stipend_big: { stipend: 1e9 }, days_frac: { pendingDaysThreshold: 1.5 }, days_0: { pendingDaysThreshold: 0 }, unknown: { foo: 1 }, empty: {},
  })) it(`rejects ${name}`, () => rejects(() => parseSettingsPatch(bad, S)));
  it('offset-only mode refuses other keys', () => rejects(() => parseSettingsPatch({ budget: 1 }, S, ['insuranceRatePct', 'stipend'])));
  it('does not mutate current', () => { parseSettingsPatch({ shares: { Ava: 1 } }, S); expect(S.shares.Ava).toBe(50); });
});

describe('parseDate', () => { it('accepts leap day', () => expect(parseDate('2028-02-29')).toBe('2028-02-29')); it('rejects non-leap', () => rejects(() => parseDate('2027-02-29'))); });
