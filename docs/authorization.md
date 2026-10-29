# Authorization

## Overview

Every protected API endpoint is guarded by two middleware functions defined in
`backend/src/middleware/auth.ts`:

- `requireAuth` — verifies the signed JWT from the `auth_token` httpOnly cookie and attaches `req.user`
- `requireRole(...roles)` — checks that `req.user.role` is in the allowed list
- `requireOwnership(getOwnerId)` — checks that `req.user.id` matches the resource owner; `ADMIN` and `PLATFORM_ADMIN` bypass this check

### Response codes

| Situation | Status |
|---|---|
| No cookie / invalid or expired token | `401 Unauthorized` |
| Authenticated but wrong role | `403 Forbidden` |
| Authenticated but not the resource owner | `403 Forbidden` |
| Authenticated and authorized | Request proceeds |

---

## Role Matrix

### Auth — `/api/auth`

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| POST | `/api/auth/register` | No | — |
| POST | `/api/auth/login` | No | — |
| POST | `/api/auth/logout` | No | — |
| GET | `/api/auth/me` | Yes | Any authenticated |

---

### Events — `/api/events`

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/api/events` | No | — |
| GET | `/api/events/:id` | No | — |
| POST | `/api/events` | Yes | `ORGANIZER` |
| PUT | `/api/events/:id` | Yes | `ORGANIZER` + ownership |
| PATCH | `/api/events/:id/submit` | Yes | `ORGANIZER` + ownership |
| PATCH | `/api/events/:id/cancel` | Yes | `ORGANIZER` + ownership |
| DELETE | `/api/events/:id` | Yes | `ORGANIZER` + ownership |
| GET | `/api/events/:id/bookings` | Yes | `ORGANIZER` + ownership |
| GET | `/api/events/:id/vendors` | Yes | `ORGANIZER` + ownership |
| PATCH | `/api/events/:id/approve` | Yes | `ADMIN` |
| PATCH | `/api/events/:id/reject` | Yes | `ADMIN` |

---

### Bookings — `/api/bookings`

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| POST | `/api/bookings` | Yes | `ATTENDEE` |
| GET | `/api/bookings/me` | Yes | Any authenticated |
| PATCH | `/api/bookings/:id/cancel` | Yes | `ATTENDEE` + ownership |

---

### Users — `/api/users`

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/api/users` | Yes | `ADMIN` |
| GET | `/api/users/:id` | Yes | `ADMIN` |
| PATCH | `/api/users/:id` | Yes | `ADMIN` — permitted name fields only |
| PATCH | `/api/users/:id/role` | Yes | `ADMIN` |
| PATCH | `/api/users/:id/status` | Yes | `ADMIN` — deactivate/reactivate ordinary accounts |
| PATCH | `/api/users/:id/deactivate` | Yes | `ADMIN` — compatibility alias accepting `{ "isActive": boolean }` |

User list filters: `search`, `role`, `status=active|inactive`, `registeredFrom`, and `registeredTo`; results are paginated using `page` and `pageSize`. Client admins cannot view or modify `ADMIN`/`PLATFORM_ADMIN` accounts or assign privileged roles. Platform-admin account management remains under `/api/platform-admin/admins`.

---

### Vendors — `/api/vendors`

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| POST | `/api/vendors/apply` | Yes | `VENDOR` |
| GET | `/api/vendors/me` | Yes | `VENDOR` |
| POST | `/api/vendors/:id/staff` | Yes | `VENDOR` + ownership |
| PATCH | `/api/vendors/:id/approve` | Yes | `ORGANIZER` + ownership of the event |
| PATCH | `/api/vendors/:id/reject` | Yes | `ORGANIZER` + ownership of the event |

---

### Tickets — `/api/tickets`

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/api/tickets/me` | Yes | Any authenticated |
| GET | `/api/tickets/:id` | Yes | Any authenticated + ownership |
| PATCH | `/api/tickets/:id/checkin` | Yes | `ORGANIZER` + ownership of the event |

---

### Reports — `/api/reports`

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/api/reports/events` | Yes | `MANAGEMENT`, `ADMIN` |
| GET | `/api/reports/events/:id` | Yes | `MANAGEMENT`, `ADMIN` |

---

## Ownership Checks

Ownership is enforced using `requireOwnership(getOwnerId)` after `requireAuth`.
The getter receives the `Request` object, queries the database for the resource,
and returns the owner's user ID. `ADMIN` and `PLATFORM_ADMIN` bypass ownership checks.

Example — protecting `PUT /api/events/:id` so only the organizer who created the event can edit it:

```ts
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole, requireOwnership } from '@/middleware/auth';

const prisma = new PrismaClient();

router.put(
  '/:id',
  requireAuth,
  requireRole('ORGANIZER'),
  requireOwnership(async (req) => {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    return event?.organizerId ?? null;
  }),
  updateEventHandler
);
```

Apply the same pattern to:
- `PATCH /api/events/:id/submit` — `event.organizerId`
- `PATCH /api/events/:id/cancel` — `event.organizerId`
- `DELETE /api/events/:id` — `event.organizerId`
- `GET /api/events/:id/bookings` — `event.organizerId`
- `GET /api/events/:id/vendors` — `event.organizerId`
- `PATCH /api/bookings/:id/cancel` — `booking.attendeeId`
- `GET /api/tickets/:id` — `ticket.holderId`
- `PATCH /api/tickets/:id/checkin` — `ticket.event.organizerId`
- `POST /api/vendors/:id/staff` — `vendorApplication.vendorId`
- `PATCH /api/vendors/:id/approve` — `vendorApplication.event.organizerId`
- `PATCH /api/vendors/:id/reject` — `vendorApplication.event.organizerId`

---

## Postman Test Cases

> Complete the login test first so Postman holds the `auth_token` cookie for subsequent requests.

---

### 1. No cookie → 401

- `GET http://localhost:5000/api/auth/me` with no cookie
- Expected: `401` — `"Not authenticated"`

---

### 2. Expired / tampered token → 401

- Manually set `auth_token` cookie to `"invalid.token.value"`
- `GET http://localhost:5000/api/auth/me`
- Expected: `401` — `"Invalid or expired session"`

---

### 3. Wrong role → 403

- Log in as an `ATTENDEE`
- `PATCH http://localhost:5000/api/events/<id>/approve`
- Expected: `403` — `"Forbidden"`

---

### 4. ATTENDEE cannot create an event → 403

- Log in as an `ATTENDEE`
- `POST http://localhost:5000/api/events`
- Expected: `403` — `"Forbidden"`

---

### 5. ORGANIZER cannot approve events → 403

- Log in as an `ORGANIZER`
- `PATCH http://localhost:5000/api/events/<id>/approve`
- Expected: `403` — `"Forbidden"`

---

### 6. ORGANIZER can create an event → proceeds

- Log in as an `ORGANIZER`
- `POST http://localhost:5000/api/events` with a valid body
- Expected: `201` or `501` (not implemented yet) — not `401` or `403`

---

### 7. ATTENDEE cannot access user management → 403

- Log in as an `ATTENDEE`
- `GET http://localhost:5000/api/users`
- Expected: `403` — `"Forbidden"`

---

### 8. ADMIN can access user management → 200

- Log in as an `ADMIN`
- `GET http://localhost:5000/api/users`
- Expected: `200` with a paginated user list — not `401` or `403`

---

### 9. ATTENDEE cannot access reports → 403

- Log in as an `ATTENDEE`
- `GET http://localhost:5000/api/reports/events`
- Expected: `403` — `"Forbidden"`

---

### 10. MANAGEMENT can access reports → proceeds

- Log in as a `MANAGEMENT` user
- `GET http://localhost:5000/api/reports/events`
- Expected: `501` (not implemented yet) — not `401` or `403`

---

### 11. VENDOR cannot apply for a stand as ATTENDEE → 403

- Log in as an `ATTENDEE`
- `POST http://localhost:5000/api/vendors/apply`
- Expected: `403` — `"Forbidden"`

---

### 12. Ownership check — ATTENDEE cancels another user's booking → 403

- Log in as `ATTENDEE A`, create a booking, note the booking ID
- Log in as `ATTENDEE B`
- `PATCH http://localhost:5000/api/bookings/<attendee-a-booking-id>/cancel`
- Expected: `403` — `"Forbidden"`
