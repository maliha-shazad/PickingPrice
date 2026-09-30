# Requirements audit — 27 September 2026

## Verdict

The core functional workflows now have expanded automated coverage, and the uncovered gaps listed below were fixed. **Not every requirement can be marked fully met:** live Google login, browser/device acceptance, actual external-payment verification, external PostgreSQL hosting and strict lint remain pending or failing.

Baseline: the supplied Picking Price requirements, sections 1–35, plus Google signup and sample data. The previous report overstated coverage: 96 assertions were combined across engines, not 96 per engine; CSS inspection did not establish responsive behavior; lint findings were not proven to predate the implementation. This report supersedes those claims.

## Functional traceability

| Requirement | Evidence | Status |
|---|---|---|
| Registration/login/logout/sessions | Worker and Express HTTP; duplicate account, incorrect password, revoked sessions and secure cookie flags | Automated pass |
| Buyer/seller/admin roles | Role-specific creation, owner checks, every admin section denies ordinary users | Automated pass |
| Fixed-price listings | Create/edit/remove; description, category/subcategory, five conditions, price/quantity/location validation | Automated pass |
| Photos | R2 and Express upload/retrieval, anonymous/SVG/oversize rejection | Automated pass; signature validation is not a full decoder assessment |
| Search/filter/sort | Name/description/brand/category queries, combined price/location/condition/type filters, every sort, injection-shaped input | Automated pass |
| Requests and lifecycle | Create/edit, expiry, Open/Responses Received/Selected/Closed/Expired/Cancelled; moderation restores original state | Automated pass |
| Request-based seller discovery | Request catalogue and filters; multiple offers, compare, contact/select | API tests plus source review; browser pending |
| Seller response management | Edit/withdraw; inactive requests reject new offers; suspended counterpart guards | Automated pass |
| Wishlist | Save/read/remove and ownership isolation, pagination | Automated pass |
| Messaging | Listing/request/offer contexts, participant-only reads/writes, persistence and reports | Automated pass |
| Reviews/ratings | Contact required, bounds, aggregation, moderation visibility, own-review dashboard | Automated pass |
| Profiles | Editable profile/capabilities, no self-admin grant, public rating/reviews and paginated active listings | Service tests; browser pending |
| 25 free listing slots | Actual 25th/26th boundary, removal frees slot, concurrent D1 last-slot reservation | Automated pass |
| Paid slots | Server-side Rs. 50 default quote, approval once, rejection preserves quota | Automated pass |
| Promotions | Default durations, configurable price/duration/placement, activation/cancellation/expiry | Service tests; browser pending |
| Manual payments | Instructions gate, unique references, approval/rejection, idempotency and duplicate concurrency | Automated pass; real payment account setup pending |
| Notifications | Message/offer/selection/limit/payment/moderation writes, expiry checks, unread/read state | Tested covered transitions; expiry evaluated on user activity |
| Administration | Stats and all data sections protected; user/content/review/promotion/report actions | API tests; browser pending |
| Categories | Disable/enable validation; update/rename code inspected | Tests plus source review |
| Homepage/dashboard content | Search/categories/featured/recent/request entry points; own listings/requests/offers/reviews/services; global messages/notifications | Source/build verified; browser pending |
| Sample data | 24 labelled products and 12 requests; examples never imply live sellers | Source verified |
| Google signup | PKCE redirect and invalid-state guards tested; real client/secret absent | Blocked for live end-to-end test |
| Email verification/reset | Not exposed as available | Optional feature, unimplemented |
| Database entities | All required entities present; excluded transaction entities absent | Migration tests and schema inspection |
| Node/Express/PostgreSQL | Portable edition builds and HTTP/domain tests use PGlite | Local pass; external deployment pending |
| Excluded functionality | No auctions/bidding/orders/shipping/product payments/wallets/AI engines | Scope inspection pass |

## Non-functional traceability

| Requirement | Evidence | Result and limits |
|---|---|---|
| Performance | Repeated paginated queries over 520+ listings, indexed owner/request queries, production bundles | Local benchmark pass; production load/network SLA untested |
| Usability | Loading/error/retry/empty states, confirmations, independent pagination, prices and role-aware dashboard | Source verified; user acceptance pending |
| Desktop/tablet/mobile | Responsive breakpoints, wrapping navigation and mobile messages | Browser testing blocked: required control-browser capability unavailable |
| Accessibility | Labels/dialog primitives, focus contrast, larger controls, reduced motion, accessible image fallback | Source reviewed; no keyboard/screen-reader or full WCAG pass claimed |
| Security | Passwords/sessions, origin checks, RBAC, validation, parameterized SQL, uploads, suspension | Basic automated checks pass; not penetration-test certification |
| Maintainability | Shared modules/adapters, validation, reproducible tests, current setup documentation | TypeScript/build pass; strict ESLint still fails |
| Reliability/persistence | D1/PGlite, media roundtrip, duplicate approvals/removals, concurrent D1 quota/reference checks | Local pass; external backups/restore and production resilience untested |

## Fixes made

- Configurable promotion durations and placement with server-calculated prices.
- Lifecycle-preserving moderation; selected requests can close after their response deadline.
- Independent seller-listing and promotion-history pagination; My reviews and received-offer request navigation.
- Category-keyword search and featured ordering during relevance searches.
- Empty-photo rejection, null/array form validation, integer pagination and same-day expiry handling.
- Safe duplicate payment/offer conflict handling and suspended-counterpart guards.
- Suspended-password-login rejection; Express upload quota/cleanup, malformed JSON handling and portable-only navigation correction.
- Improved focus contrast/control sizing; removed generated bundles from lint scope, without weakening application rules.
- Updated obsolete project/setup documentation and expanded test coverage.
- Decoded listing photos in the admin response so editing an existing listing receives an array, with regression coverage.
- Added suspension checks before session creation across both account adapters, including Google callbacks.

## Final verification results

Executed on 27 September 2026 using disposable local databases:

| Check | Result |
|---|---|
| TypeScript (`pnpm exec tsc --noEmit`) | Pass |
| Hosted production build | Pass |
| Portable React production build | Pass |
| Shared market integration suite | 253 assertions passed combined across D1 and PGlite |
| Built Worker HTTP suite | 23 checks passed |
| Express HTTP suite | 22 assertions passed with embedded PostgreSQL |
| Password hashing test | 1 test passed |
| Strict ESLint | Fail: 90 errors and 24 warnings; 88 explicit-any errors, 1 effect-state error, 1 const error |

Local browse benchmark, 30 queries over 520+ records: PGlite median 9 ms / p95 12 ms; D1 median 78 ms / p95 133 ms. These were measured locally while other build/test processes were running, and are neither production latency measurements nor an established performance SLA.

The suites are reproducible through the commands in README.md. No browser acceptance or production load-test result is inferred from these API and build passes.

## Remaining acceptance work

1. Configure the owner's real Google client/secret and complete browser signup. Only OWNER_EMAIL was configured when checked.
2. Run desktop/tablet/mobile, keyboard and screen-reader journeys when browser-control capability is available.
3. Finish strict ESLint cleanup: current findings include explicit-any typing, one effect-state update and one const declaration. Passing compilation does not make this a clean lint result.
4. Enter actual payment instructions and verify a real external transfer under owner control. Automated tests use fictitious instructions in disposable databases.
5. If the delivered host must be Express/PostgreSQL, deploy that edition to a compatible external host and test durable media, backups and concurrency. The hosted Site uses Workers/D1/R2.

Tests do not create real production accounts or perform real payments. The Site remains private.
