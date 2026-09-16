# Authentication

All auth endpoints are under `/api/auth`.  
Sessions are maintained via a signed **httpOnly cookie** — no tokens in `localStorage`.

---

## Endpoints

| Method | Path               | Auth required |
|--------|--------------------|---------------|
| POST   | `/api/auth/register` | No          |
| POST   | `/api/auth/verify-email` | No       |
| POST   | `/api/auth/resend-verification` | No |
| POST   | `/api/auth/login`    | No          |
| POST   | `/api/auth/logout`   | No          |
| GET    | `/api/auth/me`       | Yes         |

---

## POST /api/auth/register

Creates a new unverified user account and sends a six-digit OTP to the email address. The account must be verified before login.

**Request body**
```json
{
  "firstname": "Jane",
  "lastname": "Doe",
  "email": "jane.doe@example.com",
  "role": "ATTENDEE",
  "password": "securepassword123"
}
```

| Field       | Type   | Required | Rules                                                          |
|-------------|--------|----------|----------------------------------------------------------------|
| `firstname` | string | Yes      | Non-empty                                                      |
| `lastname`  | string | Yes      | Non-empty                                                      |
| `email`     | string | Yes      | Valid email format                                             |
| `role`      | string | Yes      | One of: `ATTENDEE`, `VENDOR`, `ORGANIZER`, `ADMIN`, `PLATFORM_ADMIN`, `MANAGEMENT` |
| `password`  | string | Yes      | Minimum 8 characters                                           |

**Responses**

| Status | Meaning                  | Body                                                                 |
|--------|--------------------------|----------------------------------------------------------------------|
| 201    | Account created          | `{ success: true, data: { id, firstname, lastname, email, role, createdAt } }` |
| 400    | Validation failed        | `{ success: false, message: "..." }`                                 |
| 409    | Email already registered | `{ success: false, message: "Email already registered" }`            |

The OTP expires after 10 minutes. OTP values are stored only as bcrypt hashes.

## POST /api/auth/verify-email

Verifies an account using the OTP sent during registration.

**Request body**
```json
{
  "email": "jane.doe@example.com",
  "code": "123456"
}
```

The endpoint allows five failed attempts. A successful verification marks the
user's email as verified and deletes the OTP record.

## POST /api/auth/resend-verification

Sends a new six-digit OTP for an unverified active account. The previous code
is replaced, the ten-minute expiry is restarted, and the failed-attempt count
is reset. Resend requests are limited to one per 60 seconds.

**Request body**
```json
{
  "email": "jane.doe@example.com"
}
```

The verification screen displays the ten-minute countdown and informs the user
that they have five attempts to enter the code.

---

## POST /api/auth/login

Authenticates a user and sets an `auth_token` httpOnly cookie.

**Request body**
```json
{
  "email": "jane.doe@example.com",
  "password": "securepassword123"
}
```

**Responses**

| Status | Meaning            | Body                                                                 |
|--------|--------------------|----------------------------------------------------------------------|
| 200    | Login successful   | `{ success: true, data: { id, firstname, lastname, email, role, createdAt } }` |
| 400    | Missing fields     | `{ success: false, message: "email and password are required" }`     |
| 401    | Wrong credentials  | `{ success: false, message: "Invalid email or password" }`           |
| 403    | Email not verified | `{ success: false, message: "Please verify your email before signing in" }` |

On success, the server sets:
```
Set-Cookie: auth_token=<jwt>; HttpOnly; SameSite=Lax; Max-Age=604800
```

The same `401` message is returned for both a wrong email and a wrong password — this prevents email enumeration.

---

## POST /api/auth/logout

Clears the `auth_token` cookie.

**No request body required.**

**Response**
```json
{ "success": true, "message": "Logged out" }
```

---

## GET /api/auth/me

Returns the currently authenticated user. Requires the `auth_token` cookie to be present.

**Response — 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstname": "Jane",
    "lastname": "Doe",
    "email": "jane.doe@example.com",
    "role": "ATTENDEE",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

| Status | Meaning                    | Body                                                          |
|--------|----------------------------|---------------------------------------------------------------|
| 200    | Authenticated              | User object                                                   |
| 401    | No cookie / invalid token  | `{ success: false, message: "Not authenticated" }`            |
| 401    | Expired token              | `{ success: false, message: "Invalid or expired session" }`   |

---

## Security

- Passwords are hashed with **bcrypt** (cost factor 12).
- `password_hash` is never returned in any response.
- Plain-text passwords and hashes are never written to server logs.
- The JWT is signed with `JWT_SECRET` and stored in an **httpOnly cookie** — inaccessible to JavaScript.
- CORS is configured with `credentials: true` so cookies are sent cross-origin from the frontend.
- Wrong email and wrong password return the **same error message** to prevent email enumeration.
- A dummy bcrypt compare is performed when no user is found to prevent timing-based enumeration.

---

## Postman Test Cases

> Enable **"Send cookies"** in Postman settings (Cookies tab) so the `auth_token` cookie persists between requests.

---

### 1. Successful registration

- `POST http://localhost:5000/api/auth/register`
- Body:
  ```json
  {
    "firstname": "Jane",
    "lastname": "Doe",
    "email": "jane.doe@example.com",
    "role": "ATTENDEE",
    "password": "securepassword123"
  }
  ```
- Expected: `201` — user object, no `password_hash` field

---

### 2. Successful login

- `POST http://localhost:5000/api/auth/login`
- Body:
  ```json
  {
    "email": "jane.doe@example.com",
    "password": "securepassword123"
  }
  ```
- Expected: `200` — user object, `Set-Cookie: auth_token=...` header present

---

### 3. Session persistence (simulate browser refresh)

- `GET http://localhost:5000/api/auth/me`
- No body — Postman will send the cookie from step 2 automatically
- Expected: `200` — same user object returned

---

### 4. Logout

- `POST http://localhost:5000/api/auth/logout`
- Expected: `200` — `{ "success": true, "message": "Logged out" }`, cookie cleared

---

### 5. Access /me after logout

- `GET http://localhost:5000/api/auth/me`
- Expected: `401` — `"Not authenticated"`

---

### 6. Wrong password

- `POST http://localhost:5000/api/auth/login`
- Body:
  ```json
  {
    "email": "jane.doe@example.com",
    "password": "wrongpassword"
  }
  ```
- Expected: `401` — `"Invalid email or password"`

---

### 7. Wrong email

- `POST http://localhost:5000/api/auth/login`
- Body:
  ```json
  {
    "email": "nobody@example.com",
    "password": "securepassword123"
  }
  ```
- Expected: `401` — `"Invalid email or password"` (same message as wrong password)

---

### 8. Duplicate email on register

- Send the same request as test 1 again
- Expected: `409` — `"Email already registered"`

---

### 9. Invalid email format on register

- Body:
  ```json
  {
    "firstname": "Jane",
    "lastname": "Doe",
    "email": "not-an-email",
    "role": "ATTENDEE",
    "password": "securepassword123"
  }
  ```
- Expected: `400` — `"Invalid email address"`

---

### 10. Password too short on register

- Body:
  ```json
  {
    "firstname": "Jane",
    "lastname": "Doe",
    "email": "jane2@example.com",
    "role": "ATTENDEE",
    "password": "short"
  }
  ```
- Expected: `400` — `"Password must be at least 8 characters"`
