# Care Budget — SPEC

Independent demo inspired by the problem space of Cova (YC S26). Not affiliated.
Fictional "Demo family" coordinating care for a parent. All data synthetic.

## Honesty
- Header badge: "Sample data - demo".
- Copy states every person, expense and benefit is synthetic; math is a fixed-formula illustration, not financial advice.
- Footer: "Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by Cova."

## Tech
Next.js static export (`output: 'export'`), TypeScript, no runtime external calls (no remote fonts/APIs). `npm run build` must pass. Dark UI, accent red #ef4444. Desktop-first, usable at 390px (no horizontal page scroll; tables scroll inside their card or reflow).

## Fixed reference
"Today" is the constant 2026-11-16 (no Date.now) so output is deterministic. The ledger is a list of recent expenses (the seed spans Oct 6 - Nov 25, 2026); its date range is computed and shown. No calendar-month claim is made.

## Slices
1. **Data** (`lib/data.ts`): 10 ledger items {id, desc, category, amount, payer, status: paid|pending|planned, pendingDays?}. Categories: Caregiver hours, Medical supplies, Transport, Home modifications, Medications. Members: Ava, Ben, Cal (fictional).
2. **Summary** (`lib/calc.ts`): listed spend (gross) = sum of all listed items. offsets (slice 3). net = max(gross - offsets, 0)... shown raw as gross - offsets. Split by editable shares (default 50/30/20); shares are normalized by their sum (sum shown; warning if != 100). Person amount = net * share/sum. Editable monthly budget (default $3,000).
3. **Offsets**: Insurance reimbursement = 60% of Medications + Medical supplies spend. State caregiving stipend = flat $400/mo. Labeled illustrative.
4. **Projection**: month m net = net * (1+g)^(m-1), g editable 0–10% per month (default 3%, step 0.5). Strip of 12 months; cumulative at months 3, 6, 12 highlighted. Formula shown.
5. **Flags** (thresholds fixed and visible): OVER BUDGET when listed net > monthly budget (the listed expenses are compared against the budget, not claimed to be the month); PENDING EXPENSES AGING when any expense with status pending is dated > 30 days before the demo today (payment status + expense date only; no claim status is implied). Summary figures are labeled 'Listed ...'; 'Paid so far' sums status=paid only. Each flag shows state (active/clear), threshold and the values compared.

## Done when
Build passes; all numbers update live from inputs; usable at 390px.
