# Frontend Authentication

## Overview

Authentication state is managed centrally in `AuthContext`. The session is
backed by an **httpOnly cookie** set by the backend — no tokens are stored in
`localStorage` or `sessionStorage`.

---

## Files Changed

| File | Purpose |
|---|---|
| `src/types/user.ts` | `User` shape matches backend (`firstname`/`lastname`) |
| `src/services/api.ts` | `withCredentials: true` on every request |
| `src/services/authService.ts` | Typed wrappers for all four auth endpoints |
| `src/context/AuthContext.tsx` | Central auth state, session restore on mount |
| `src/components/layout/ProtectedRoute.tsx` | Waits for session restore before redirecting |
| `src/components/layout/Navbar.tsx` | Shows user name and role-based nav links |
| `src/pages/auth/Login.tsx` | Login form with field-level validation |
| `src/pages/auth/Register.tsx` | Registration form with field-level validation |

---

## AuthContext

`src/context/AuthContext.tsx`

### What it does

- On mount, calls `GET /api/auth/me` to restore the session from the cookie.
- Exposes `loading: boolean` — `true` until the `/me` call resolves.
- Exposes `setUser(user)` — called after a successful login or registration.
- Exposes `logout()` — calls `POST /api/auth/logout` to clear the cookie, then sets `user` to `null`.

### Why no localStorage

The JWT lives in an **httpOnly cookie** managed by the browser. The frontend
never reads or writes the token directly. This prevents XSS attacks from
stealing the session token.

### API

```ts
const { user, loading, setUser, logout } = useAuth();
```

| Value | Type | Description |
|---|---|---|
| `user` | `User \| null` | The signed-in user, or `null` |
| `loading` | `boolean` | `true` while the initial `/me` call is in flight |
| `setUser` | `(user: User) => void` | Store the user after login/register |
| `logout` | `() => Promise<void>` | Clear the cookie and reset state |

---

## API Client

`src/services/api.ts`

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  withCredentials: true,
});
```

`withCredentials: true` tells the browser to include the `auth_token` cookie
on every cross-origin request. This is required for the httpOnly cookie to
work with a separate frontend/backend origin.

The backend must have `credentials: true` in its CORS config (already set).

---

## Protected Routes

`src/components/layout/ProtectedRoute.tsx`

Wraps role-restricted route groups in `App.tsx`.

```tsx
<Route element={<ProtectedRoute roles={['ORGANIZER']} />}>
  <Route path="/organizer" element={<OrganizerDashboard />} />
</Route>
```

### Behaviour

| State | Result |
|---|---|
| `loading === true` | Renders nothing (waits for session restore) |
| `user === null` | Redirects to `/login` |
| `user.role` not in `roles` | Redirects to `/` |
| Authenticated and authorized | Renders `<Outlet />` |

The `loading` check is critical — without it, every page refresh would
redirect to `/login` before the `/me` call completes.

---

## Login Form

`src/pages/auth/Login.tsx`

### Validation (client-side, before the request)

| Field | Rule | Error message |
|---|---|---|
| `email` | Required | "Email is required" |
| `email` | Valid format | "Enter a valid email address" |
| `password` | Required | "Password is required" |

Errors appear inline below each field using the `Input` component's `error` prop.

### Server errors

| HTTP status | Displayed message |
|---|---|
| `401` | Message from server (`"Invalid email or password"`) |
| Other | `"Something went wrong. Please try again."` |

A server error banner appears above the form.

### On success

Calls `setUser(res.data.data)` then navigates to `/`.

---

## Registration Form

`src/pages/auth/Register.tsx`

### Fields

| Field | Type | Notes |
|---|---|---|
| First name | text | Required |
| Last name | text | Required |
| Email | email | Required, valid format |
| Password | password | Required, min 8 characters |
| Role | select | `ATTENDEE`, `ORGANIZER`, `VENDOR` |

### Validation (client-side)

| Field | Rule | Error message |
|---|---|---|
| `firstname` | Required | "First name is required" |
| `lastname` | Required | "Last name is required" |
| `email` | Required | "Email is required" |
| `email` | Valid format | "Enter a valid email address" |
| `password` | Required | "Password is required" |
| `password` | Min 8 chars | "Password must be at least 8 characters" |
| `role` | Selected | "Please select a role" |

### Server errors

| HTTP status | Displayed message |
|---|---|
| `409` | "An account with this email already exists." |
| Other | Message from server or generic fallback |

### On success

Calls `setUser(res.data.data)` then navigates to `/`.

---

## Navbar

`src/components/layout/Navbar.tsx`

- Shows role-specific navigation links based on `user.role`.
- Displays `firstname lastname` when signed in.
- Shows a **Logout** button when signed in; shows a **Login** link when signed out.
- Logout calls `logout()` from `AuthContext` then navigates to `/login`.

### Role → nav links

| Role | Links shown |
|---|---|
| `ATTENDEE` | Events |
| `ORGANIZER` | Events, Dashboard |
| `VENDOR` | Events, Dashboard |
| `ADMIN` | Events, Admin |
| `PLATFORM_ADMIN` | Settings |
| `MANAGEMENT` | Reports |

---

## Session Persistence

On every page load/refresh:

1. `AuthProvider` mounts and calls `GET /api/auth/me` with `withCredentials: true`.
2. The browser automatically sends the `auth_token` cookie.
3. If the cookie is valid, the backend returns the user object and `setUser` is called.
4. If the cookie is absent or expired, `user` stays `null`.
5. `loading` is set to `false` in both cases.
6. `ProtectedRoute` only makes its redirect decision after `loading === false`.

This means refreshing the page never logs the user out as long as the cookie
is still valid (7-day expiry).

---

## Security Notes

- Tokens are stored in **httpOnly cookies only** — never in `localStorage`.
- `withCredentials: true` is set globally on the axios instance.
- Frontend role checks (nav links, `ProtectedRoute`) are for UX only.
- All real authorization is enforced by the backend middleware.
- The backend returns the same error message for wrong email and wrong password
  to prevent email enumeration — the frontend displays it as-is.
