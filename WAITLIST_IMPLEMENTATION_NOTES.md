# Waitlist lifecycle implementation notes (Issues #21–#24)

This update preserves the existing waitlist registration and booking-cancellation flows and adds the missing offer lifecycle pieces.

## Included changes

- Issue #21: existing waitlist registration, queue and attendee waitlist display retained.
- Issue #22: existing booking cancellation and inventory-release flow retained.
- Issue #23: offer creation now also creates an in-app notification and attempts an email notification. The periodic recovery task scans waiting queues when capacity is available, covering an offer-generation failure after a booking cancellation has already committed. Leaving an active OFFERED entry releases its reservation and advances the queue.
- Issue #24: added offer claim endpoint, free-ticket claim completion, paid-ticket pending booking creation, payment completion linkage, expiry processing, inventory release, queue advancement and attendee dashboard claim controls.

## New API endpoints

- `GET /api/waitlists/offers/my` — current attendee's offered, claimed and expired entries.
- `POST /api/waitlists/:id/claim` — claim an active offer. Free tickets are confirmed immediately. Paid tickets create a pending booking and return `paymentRequired: true`; the frontend directs the attendee to the existing simulated checkout route.

Existing endpoints remain in place.

## Database migration

A new migration was added:

`backend/prisma/migrations/20261125100000_complete_waitlist_claim_lifecycle/migration.sql`

It adds a nullable unique `waitlist_entry_id` link to bookings so a claim can be associated with its booking and payment lifecycle.

From the `backend` directory, after configuring your own local `.env` and ensuring `DATABASE_URL` points to the intended database, run:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

Do not run this against production until the migration has been reviewed and backed up. No database was available in this environment, so the migration was not applied here.

## Expiration processing

The backend starts a periodic expiration/recovery worker when `server.ts` starts. It checks expired offers every 30 seconds, expires them transactionally, releases their reserved capacity and attempts to offer the released ticket to the next attendee. It also recovers waiting queues when ticket capacity is available. Database row locks and conditional status updates are used to avoid processing an offer twice across concurrent workers.

## Payment behaviour

Free waitlist claims create a confirmed booking and issue the ticket without decrementing inventory again, because the ticket was already reserved when the offer was created.

Paid waitlist claims create a pending booking linked to the waitlist entry. The existing simulated payment flow recognizes that reservation and does not decrement capacity a second time. On successful payment, the waitlist entry becomes `CLAIMED`. If the offer expires before payment completes, the pending booking is cancelled and the reservation is released.

The current project uses simulated payments; this update does not introduce or claim to integrate a real payment provider.

## Verification limitations

Changed TypeScript/TSX files passed a syntax-transpilation check. Full Prisma validation, TypeScript type-check/build, frontend production build and database integration tests could not be run in this environment because project dependencies were unavailable offline and no PostgreSQL test database was configured. Run the commands above and the existing project test scripts locally before deploying.

The ZIP intentionally excludes `.git`, `node_modules`, local `.env` files, private uploads and build outputs. Restore local secrets from your own secure environment configuration; do not share `.env` files.
