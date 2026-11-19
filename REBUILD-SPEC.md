# Care Budget v2 - high-fidelity rebuild spec

Rebuild this static demo into a real working product with a live backend. Maps to Cova (cova.care, YC S26): a licensed home care agency whose AI-run back office lets it pay caregivers the highest base rate in Michigan, charge families less, and get unpaid family caregivers paid through programs like Michigan Home Help. Care Budget demonstrates the family-economics core: a persisted caregiving-finance board where a family tracks real monthly care costs, applies offset programs (insurance reimbursement, state stipend - the exact class of programs Cova enrolls people in), and splits the net across family members with visible, deterministic math.

Do not deploy, do not git commit, do not push. No paid services, no API keys, no randomness (pure functions).

## Architecture
- Next.js App Router + TypeScript + Tailwind, SERVER runtime (remove output:'export'). Model the architecture on ~/proj/marengo-grid-plan (lib/api.ts route helper, lib/db drizzle store, lib/validate.ts, owner cookie, rate limiting) - read it first.
- Drizzle ORM: SQLite (carebudget.db) dev; Postgres via DATABASE_URL prod.
- The calc core (gross, offsets, net, split normalization, projection, flags) is the pure tested core, server-side, unit-tested (npm test). All thresholds and rates are editable, visible constants stored per owner.

## Product workflow (fitted to THIS product)
1. Home = the family budget board: ledger table first, summary panel beside it; first useful action (add expense) above the fold on mobile.
2. Ledger CRUD: add/edit/delete expense items {desc, category, amount, payer, status: paid|pending|planned, date}. Categories: Caregiver hours, Medical supplies, Transport, Home modifications, Medications. Members Ava, Ben, Cal (fictional "Demo family" caring for a parent).
3. Summary panel: gross, offsets, net out-of-pocket, per-person split from editable shares (normalized by sum; sum displayed; warning when sum != 100). Editable monthly budget (default $3,000).
4. Offsets: insurance reimbursement = 60% of Medications + Medical supplies (rate editable, labeled illustrative); state caregiving stipend = flat $400/mo (editable, labeled illustrative - the demo copy should note this mirrors the class of programs like Michigan Home Help that agencies like Cova enroll families in, WITHOUT claiming any real enrollment).
5. 12-month projection strip: net * (1+g)^(m-1), g editable 0-10% (default 3%, step 0.5); cumulative at months 3, 6, 12; formula shown.
6. Flags computed server-side with visible thresholds: OVER BUDGET (net > budget), REIMBURSEMENT WAITING (any pending item older than 30 days against the fixed demo "today" 2026-11-16). Each flag shows state, threshold, and the values compared.
7. Everything persists per owner; a fresh visitor gets the seeded Demo family dataset; edits are their own.

## Truthfulness bar
- Header badge "Sample data - demo"; copy states every person, expense and benefit is synthetic and the math is a fixed-formula illustration, not financial advice. Offset programs labeled illustrative, never presented as real enrollment or eligibility.
- Footer: "Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by Cova."

## Abuse and isolation controls
- Owner cookie (cb_uid, httpOnly); all data owner-scoped; cross-owner 403/404.
- Rate limits: 120 writes/hour/owner persisted in DB, 413 at 20KB; inputs validated (amount positive within sane bounds, desc length cap, shares 0-100, rates 0-100%).

## UI bar
- Light theme, near-white ground, hairlines, small-caps labels, tabular nums, system stack; mono for figures.
- Brand accent: deep magenta #be185d (hover #9d174d). Deliberate: care/warmth read for a family-caregiving finance tool, clearly pink-magenta (NOT fuchsia/violet band, NOT the sibling wine-crimson #9f1239 or signal red #b91c1c); distinct from every sibling accent. Comment the rationale in tailwind.config.ts.
- Pills only for status chips; buttons 8px, cards 10px, inputs 8px; no gradients, no emoji icons, no hero+3-cards, no amber-50 fills. NOT the old dark theme.
- Layout fitted to a family finance worksheet, not a clone of sibling demos. Mobile: stacked, add-expense reachable without scrolling.

## Definition of done
- npm run build + npm test pass.
- Real end-to-end: run server; hand-check one month summary against independent recomputation; add/edit/delete a ledger item and verify summary, projection and flags update; edit shares and verify normalization and warning; edit offset rate and verify net changes; persistence across restart; owner isolation; rate limit.
- python3 ~/unslop/devibe_scan.py . - zero high or justified unslop-ignore comments.
- README + IMPLEMENTATION.md (data model, endpoints, verification results).
- Screenshots to /tmp: cb2-board.png, cb2-summary.png, cb2-edit.png, cb2-mobile.png (390px) from the RUNNING app.
