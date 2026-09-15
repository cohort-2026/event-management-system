# Email Verification with SMTP OTP

## Overview

EventMS verifies a user's email address before allowing the user to sign in.
During registration, the backend creates the account as unverified, generates a
six-digit one-time password (OTP), stores only its bcrypt hash, and sends the
OTP through SMTP. The user enters the OTP in the frontend verification screen.

A user can sign in only when:

- The account is active.
- The password is correct.
- The email has been verified.

## Files Implemented

| File | Responsibility |
|---|---|
| `backend/prisma/schema.prisma` | Adds `emailVerified` and `EmailVerification` storage |
| `backend/prisma/migrations/20260915113112_add_email_verification/migration.sql` | Applies the database changes |
| `backend/src/config/index.ts` | Loads SMTP settings from environment variables |
| `backend/src/services/emailService.ts` | Sends verification emails through Nodemailer SMTP |
| `backend/src/controllers/authController.ts` | Registration, verification, resend, and login rules |
| `backend/src/routes/authRoutes.ts` | Exposes the verification endpoints |
| `backend/src/services/authService.ts` | Frontend API wrappers for auth requests |
| `frontend/src/pages/auth/Register.tsx` | Redirects newly registered users to verification |
| `frontend/src/pages/auth/Login.tsx` | Shows the verification link for unverified users and sends a new OTP when clicked |
| `frontend/src/pages/auth/VerifyEmail.tsx` | OTP input, expiry countdown, verification, and resend UI |
| `frontend/src/App.tsx` | Registers the `/verify-email` route |
| `backend/.env.example` | Documents the required SMTP variables |

## Database Changes

### User fields

The `users` table now includes:

```text
email_verified BOOLEAN NOT NULL DEFAULT FALSE
```

Prisma exposes this as `User.emailVerified` and maps it to the database column
`email_verified`.

### EmailVerification table

| Field | Description |
|---|---|
| `id` | UUID primary key |
| `user_id` | Unique reference to the user |
| `code_hash` | Bcrypt hash of the six-digit OTP; plaintext OTPs are never stored |
| `expires_at` | OTP expiration timestamp |
| `attempts` | Number of failed verification attempts |
| `created_at` | Timestamp used for resend cooldown calculation |

Each user has at most one active verification record. A successful verification
deletes the record.

## SMTP Configuration

Copy the SMTP values into `backend/.env`:

```env
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your-smtp-user
MAIL_PASSWORD=your-smtp-password
MAIL_FROM=no-reply@example.com
```

The service uses Nodemailer:

- Port `465` uses a secure SMTP connection.
- Other ports use the standard Nodemailer transport configuration.
- `MAIL_FROM` is used as the sender address.
- SMTP credentials must remain in `.env` and must not be committed.

The email subject is:

```text
Verify your EventMS email address
```

The email contains the six-digit OTP and states that it expires in ten minutes.

## Registration Flow

`POST /api/auth/register` performs the following steps:

1. Trims and lowercases the email address.
2. Validates the required fields, email format, and minimum eight-character password.
3. Rejects duplicate email addresses.
4. Hashes the password using bcrypt with twelve salt rounds.
5. Creates the user with `emailVerified = false`.
6. Generates a cryptographically secure six-digit OTP using `crypto.randomInt`.
7. Hashes the OTP using bcrypt.
8. Stores the hash with a ten-minute expiration.
9. Sends the OTP by SMTP.
10. Returns the email address and asks the frontend to begin verification.

The registration response does not return the OTP or the password hash.

## Verification Flow

`POST /api/auth/verify-email`

Request:

```json
{
  "email": "jane.doe@example.com",
  "code": "123456"
}
```

Rules:

- The code must contain exactly six digits.
- The account must exist and be active.
- The verification record must exist and not be expired.
- The user has a maximum of five failed attempts.
- Each failed code increments `attempts`.
- Invalid, expired, exhausted, inactive, or unknown verification requests use a generic error message.
- On success, the backend updates `emailVerified` to `true` and deletes the verification record in a transaction.

Success response:

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

If the email is already verified, the endpoint returns a successful already
verified response without issuing another session.

## Resend Flow

`POST /api/auth/resend-verification`

Request:

```json
{
  "email": "jane.doe@example.com"
}
```

For an active, unverified account, the backend:

1. Generates a new six-digit OTP.
2. Replaces the previous OTP hash.
3. Resets the failed-attempt count to zero.
4. Starts a new ten-minute expiry.
5. Sends the new OTP through SMTP.

A resend is allowed once every 60 seconds. Requests made during the cooldown
return HTTP `429` and include `retryAfter`:

```json
{
  "success": false,
  "message": "Please wait 42 seconds before requesting another code",
  "retryAfter": 42
}
```

Unknown, inactive, or already verified accounts use a generic success response
to avoid exposing account state through the resend endpoint.

## Login Behavior

`POST /api/auth/login` still validates the email and password first. After a
successful password check, it rejects:

- Inactive accounts with `403 This account is inactive`.
- Unverified accounts with `403 Please verify your email before signing in`.

The JWT cookie is created only after the account passes email verification.

## Frontend Behavior

### Registration

After registration succeeds, the user is sent to `/verify-email` with the email
address in router state.

### Verification screen

The verification screen provides:

- Email address input.
- Six-digit numeric OTP input.
- Ten-minute countdown displayed as `MM:SS`.
- Notice that the user has five attempts.
- Verify button.
- Resend button.
- Sixty-second resend countdown.
- Success and error messages from the backend.

After a successful verification, the user is sent to the login page with the
email prefilled.

### Login verification link

When login returns the exact unverified-account response, the login error shows
a `Verify your email` link. Clicking it calls the resend endpoint first, so the
OTP is sent immediately, then opens `/verify-email`.

If the resend cooldown is active, the verification screen displays the backend
cooldown message and starts the remaining cooldown timer instead of sending a
second email.

## Seed Accounts

Development seed accounts are created or updated with:

```text
emailVerified = true
```

This keeps the standard development accounts usable without requiring SMTP
delivery. Run the seed command after applying the migration:

```bash
cd backend
npm run db:seed
```

## Setup and Validation

Install the SMTP dependency:

```bash
cd backend
npm install nodemailer
npm install --save-dev @types/nodemailer
```

Apply the database migration:

```bash
npx prisma migrate dev --name add_email_verification
npm run db:generate
```

Build both applications:

```bash
cd backend
npm run build

cd ../frontend
npm run build
```

Before testing registration, confirm that:

1. PostgreSQL is running.
2. `backend/.env` contains a valid `DATABASE_URL`.
3. `backend/.env` contains valid SMTP credentials.
4. The SMTP sender address is permitted by the mail provider.
5. The backend is running before submitting the registration form.

## Security Decisions

- OTPs are generated with `crypto.randomInt`.
- OTPs are stored only as bcrypt hashes.
- Passwords continue to use bcrypt with twelve salt rounds.
- OTPs expire after ten minutes.
- Failed verification attempts are limited to five.
- Resends are limited to once every sixty seconds.
- Verification codes and passwords are never returned in API responses.
- Generic resend and verification messages reduce email/account enumeration risk.
- Login does not issue an authentication cookie until email verification succeeds.
- SMTP secrets stay in environment variables and are not committed.

## API Summary

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create an unverified account and send the first OTP |
| `POST` | `/api/auth/verify-email` | No | Verify the email using the OTP |
| `POST` | `/api/auth/resend-verification` | No | Send a replacement OTP after the cooldown |
| `POST` | `/api/auth/login` | No | Sign in only after email verification |

## Known Operational Requirement

The application code cannot deliver email until valid SMTP values are supplied in
`backend/.env`. The placeholder values in `.env.example` are documentation only.
For local development, use a real SMTP provider or a development mail catcher,
and never commit the actual SMTP password.
