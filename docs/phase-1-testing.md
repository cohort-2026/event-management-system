# Phase 1 workflow testing

## Status

**Implementation is ready for review, but Phase 1 is not fully acceptance-verified.** Source-contract tests, Prisma schema validation, backend compilation, frontend lint, and frontend production build were executed successfully. The production database was not changed. The complete migration chain and live HTTP/database role workflows still need verification against a disposable PostgreSQL test database.

The project had no configured test framework. These tests use Node.js's built-in `node:test` runner and add no dependencies. They verify source contracts and migration characteristics; they do not simulate database rows, make HTTP requests, or prove that a role workflow succeeds at runtime.

## Running checks

From the repository root:

```powershell
Push-Location backend
npm run test:phase1
npx prisma validate
$env:PRISMA_CLIENT_ENGINE_TYPE = 'binary'
npm run build
Pop-Location

Push-Location frontend
npm run lint
npm run build
Pop-Location
```

The binary-engine override was needed on the development machine because a running process held Prisma's Windows library engine file open. It does not change `schema.prisma` or project defaults. On an environment without that file lock, `npm run build` can be used without the override.

To validate migrations, configure `DATABASE_URL` to a newly-created disposable PostgreSQL database, then run `npx prisma migrate deploy` from `backend`. Do not use the production database or `prisma migrate reset`. Migration deployment was not run for this report.

## Executed automated test cases

All cases below ran using `npm run test:phase1`.

| Test | Expected result | Actual result |
|---|---|---|
| Current role and event-status enums | Exactly four roles (`ATTENDEE`, `VENDOR`, `ORGANIZER`, `ADMIN`) and four current event statuses | Passed |
| Legacy enum migration | Legacy roles/statuses remap and records are not deleted | Passed by SQL source inspection |
| Booking ticket-type migration | Nullable foreign key is additive and preserves old bookings | Passed by SQL source inspection |
| Public registration roles | Registration permits Attendee, Vendor, Organizer, but not Admin | Passed by backend/frontend source-contract checks |
| Authentication wiring | Login verifies passwords and protected requests verify the cookie JWT against the current database user | Passed by source-contract checks |
| Profile approval | Organizer and Vendor decisions are Admin-only; unapproved Vendor and Organizer operations are gated | Passed by route/middleware source-contract checks |
| Event management | Approved Organizers own create/edit/publish/cancel/delete operations; event publication does not require Admin review | Passed by source-contract checks |
| Public event visibility | Public list and detail queries filter to `PUBLISHED` | Passed by source-contract checks |
| Frontend roles and dashboards | All four dashboard routes are role-protected and role redirects are defined | Passed by source-contract checks |
| API route stubs | No backend route returns the placeholder 501 status | Passed |

## Required workflow coverage and results

“Not run” means that no live HTTP request or database-backed test was executed; source inspection is not reported as a successful runtime test.

| Area | Test cases | Expected result | Actual result |
|---|---|---|---|
| Authentication | Attendee/Vendor/Organizer registration; public Admin registration rejection; login for all four roles; invalid credentials; unauthenticated protected request | Allowed registrations and valid logins succeed; Admin signup, bad credentials, and unauthenticated requests are rejected | Source-contract cases passed; live HTTP tests not run |
| Authorization | Attendee on Admin API; Vendor on Organizer API; Organizer on Admin API; unapproved Organizer event operations; unapproved Vendor restricted APIs; cross-user records | Requests are denied without exposing or mutating another user's records | Route/middleware source-contract checks passed; live authorization tests not run |
| Profile approval | Organizer and Vendor submit, Admin approves and rejects | Decisions change profile state; approved profiles unlock restricted functionality | Route/middleware source-contract checks passed; live database tests not run |
| Events | Approved Organizer create/edit/publish/cancel; cross-owner edit; unapproved publish; Admin event approval attempts; draft visibility | Organizer-owned events transition without Admin event approval; drafts stay private | Source-contract checks passed; live event workflow tests not run |
| Database | Schema validation, client generation, data-preserving migration, old enum removal | Schema/client valid; historical records retained; obsolete enum values absent | Schema validation and client generation passed. Legacy data preservation was inspected, not executed; migration deployment not run |
| Frontend | Four role redirects and protected routes; all dashboards; API contracts | Role users reach their dashboards, protected routes enforce role, and pages use available APIs | Production build and lint passed; browser/API smoke tests not run |

## Build and validation results

| Command | Actual result |
|---|---|
| `npm run test:phase1` (`backend`) | Passed: 10 tests, 0 failures |
| `npx prisma validate` (`backend`) | Passed |
| `PRISMA_CLIENT_ENGINE_TYPE=binary npm run build` (`backend`) | Passed |
| `npm run lint` (`frontend`) | Passed |
| `npm run build` (`frontend`) | Passed, with existing Vite `__dirname`, CSS `@import`, and chunk-size warnings |
| `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` | Passed; schema can produce SQL without a database |
| `npx prisma migrate diff --from-migrations ... --shadow-database-url ...` | Not a validation result: the deliberately unreachable test URL returned P1001; no database was accessed |
| Live HTTP workflow suite / migration deploy | Not run |

## Integration changes

- Public registration DTOs no longer allow `ADMIN`; backend registration already enforced the same rule.
- Draft-event deletion now has a handler scoped to the owning Organizer and rejects non-draft events or events with bookings/vendor applications.
- The previous 501 route stubs now have handlers for Admin user management, booking/ticket access, ticket check-in, Admin event reports, and approved vendor staff additions.
- Free bookings decrement event and ticket-type availability atomically and issue an active ticket. Paid ticket checkout is explicitly rejected until payment processing is integrated.
- Added an additive nullable link from existing bookings to event ticket types; existing records remain valid.
- Frontend booking/ticket API types now match the API response envelope.
- Fixed the existing frontend lint errors and separated the auth hook from its provider component for Fast Refresh compliance.

## Known issues and outstanding verification

- Paid ticket checkout is not implemented. The booking API returns `409` for paid ticket types rather than creating a misleading unpaid reservation.
- Runtime authentication, authorization, approval, booking, event, and dashboard scenarios need an HTTP integration suite using an isolated test database.
- The migration chain, including legacy enum remapping with seeded legacy rows, needs to be deployed and verified against a disposable PostgreSQL database.
- Browser smoke tests for the four role dashboards and redirects were not run.
- Frontend build emits existing Vite config, CSS import-order, and bundle-size warnings; none failed the build.

## Phase 1 completion

**Ready for code review; not ready to mark Phase 1 complete.** The implementation and static verification are in place, but the acceptance criteria requiring safe database-migration validation and live role-workflow verification remain outstanding.
