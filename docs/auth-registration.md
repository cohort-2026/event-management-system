# User Registration

## Endpoint

`POST /api/auth/register`

---

## Request

**Headers**
```
Content-Type: application/json
```

**Body**
```json
{
  "firstname": "Jane",
  "lastname": "Doe",
  "email": "jane.doe@example.com",
  "password": "securepassword123"
}
```

| Field       | Type   | Required | Rules                        |
|-------------|--------|----------|------------------------------|
| `firstname` | string | Yes      | Non-empty                    |
| `lastname`  | string | Yes      | Non-empty                    |
| `email`     | string | Yes      | Valid email format           |
| `password`  | string | Yes      | Minimum 8 characters         |

---

## Responses

### 201 Created — Success
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

### 400 Bad Request — Missing fields
```json
{ "success": false, "message": "firstname, lastname, email and password are required" }
```

### 400 Bad Request — Invalid email
```json
{ "success": false, "message": "Invalid email address" }
```

### 400 Bad Request — Short password
```json
{ "success": false, "message": "Password must be at least 8 characters" }
```

### 409 Conflict — Duplicate email
```json
{ "success": false, "message": "Email already registered" }
```

---

## Security

- Passwords are hashed with **bcrypt** (cost factor 12) before being stored.
- `password_hash` is **never** returned in any response.
- Plain-text passwords and hashes are **never** written to server logs.
- Only `id`, `firstname`, `lastname`, `email`, `role`, and `createdAt` are returned.

---

## Postman Test Cases

### 1. Successful registration
- Method: `POST`
- URL: `http://localhost:5000/api/auth/register`
- Body:
  ```json
  {
    "firstname": "Jane",
    "lastname": "Doe",
    "email": "jane.doe@example.com",
    "password": "securepassword123"
  }
  ```
- Expected: `201` — user object without `password_hash`

---

### 2. Invalid email
- Body:
  ```json
  {
    "firstname": "Jane",
    "lastname": "Doe",
    "email": "not-an-email",
    "password": "securepassword123"
  }
  ```
- Expected: `400` — `"Invalid email address"`

---

### 3. Password too short
- Body:
  ```json
  {
    "firstname": "Jane",
    "lastname": "Doe",
    "email": "jane2@example.com",
    "password": "short"
  }
  ```
- Expected: `400` — `"Password must be at least 8 characters"`

---

### 4. Missing required field
- Body:
  ```json
  {
    "email": "jane3@example.com",
    "password": "securepassword123"
  }
  ```
- Expected: `400` — `"firstname, lastname, email and password are required"`

---

### 5. Duplicate email
- Send the same valid request from test case 1 a second time.
- Expected: `409` — `"Email already registered"`
