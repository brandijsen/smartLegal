# InvParser API Reference

Base URL: `/api`  
Authentication: **httpOnly cookies** (`accessToken`, `refreshToken`) sent with `credentials: true` on cross-origin requests, **or** optional `Authorization: Bearer <accessToken>` for API clients.

---

## Authentication

Browser clients: cookies are set on login/register/refresh/OAuth/verify; the SPA does **not** store the access token in `localStorage`.

Optional header (scripts, mobile apps):

```
Authorization: Bearer <accessToken>
```

---

## Auth (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Register new user |
| POST | `/login` | No | Login (sets httpOnly access + refresh cookies) |
| POST | `/refresh` | Cookie | Refresh access cookie (`{ "ok": true }`) |
| GET | `/me` | Yes | Get current user profile |
| PATCH | `/profile` | Yes | Update name/email |
| POST | `/change-password` | Yes | Change password |
| GET | `/avatar` | Yes | Get user avatar image |
| POST | `/profile/avatar` | Yes | Upload avatar (multipart/form-data, field: `avatar`) |
| GET | `/export-data` | Yes | Export user data (GDPR) |
| POST | `/request-delete` | Yes | Request account deletion |
| GET | `/confirm-delete/:token` | No | Confirm deletion (email link) |
| POST | `/send-verification` | Yes | Send verification email |
| GET | `/verify/:token` | No | Verify email |
| GET | `/google` | No | Start Google OAuth |
| GET | `/google/callback` | No | Google OAuth callback |
| POST | `/logout` | No | Logout (clears auth cookies) |
| POST | `/forgot-password` | No | Request password reset |
| POST | `/reset-password/:token` | No | Reset password with token |

### Examples

**Register**
```json
POST /api/auth/register
{ "name": "John Doe", "email": "john@example.com", "password": "Secret123" }
→ { "user": { "id", "name", "email", "verified" } } + Set-Cookie (access, refresh)
```
Password rules: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number.

**Login**
```json
POST /api/auth/login
{ "email": "john@example.com", "password": "secret123" }
→ { "user": { "id", "name", "email", "verified" } } + Set-Cookie (access, refresh)
```

**Update profile**
```json
PATCH /api/auth/profile
{ "name": "John", "email": "john@example.com" }
→ { "id", "name", "email", "verified" }
```

**Change password**
```json
POST /api/auth/change-password
{ "currentPassword": "old", "newPassword": "NewPass123" }
→ { "message": "Password updated successfully" }
```
`newPassword` must follow same rules as register (min 8 chars, 1 upper, 1 lower, 1 number).

---

## Documents (`/api/documents`)

All document endpoints require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user documents (paginated, filterable) |
| GET | `/export/csv` | Export documents as CSV |
| GET | `/export/excel` | Export documents as Excel |
| GET | `/defective/list` | List defective documents |
| POST | `/bulk-unmark-defective` | Bulk unmark defective |
| POST | `/bulk-retry` | Bulk retry failed documents |
| GET | `/:id` | Get document metadata |
| GET | `/:id/download` | Download PDF file |
| GET | `/:id/result` | Get parsed result (JSON) |
| GET | `/:id/raw` | Get raw extracted text |
| GET | `/:id/tags` | Get document tags |
| PATCH | `/:id/tags` | Set document tags |
| POST | `/upload` | Upload PDF(s) (multipart, field: `files`, max 20) |
| POST | `/:id/retry` | Retry failed document |
| POST | `/:id/mark-defective` | Mark as defective |
| POST | `/:id/unmark-defective` | Unmark defective |
| PATCH | `/:id/result` | Update parsed result (manual edit) |
| PATCH | `/:id/supplier` | Link document to supplier |
| DELETE | `/:id` | Delete document |

### List documents (GET `/`)

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |
| status | string | `all`, `pending`, `parsed`, `failed` |
| dateFrom | string | ISO date (e.g. `2025-01-01`) |
| dateTo | string | ISO date |
| search | string | Search in filename, supplier, parsed data |
| defective | string | `all`, `only` |
| supplier | string | Supplier ID or `all` |
| tag | string | Tag ID or `all` |

**Response**
```json
{
  "documents": [...],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### Export (GET `/export/csv` | `/export/excel`)

Same query params as list (status, dateFrom, dateTo, search, defective, supplier, tag). Returns file download.

### Upload (POST `/upload`)

```
Content-Type: multipart/form-data
files: PDF file(s) (max 20)
```

**Response (single file)**
```json
{ "id", "original_name", "stored_name", "status", "uploaded_at", ... }
```

**Response (multiple files)**
```json
{
  "message": "N documents uploaded successfully",
  "documents": [...],
  "batchId": "uuid"
}
```

### Update result (PATCH `/:id/result`)

```json
{ "parsed_json": { "invoice_number": "...", "total": 100, ... } }
→ { "message": "...", "manually_edited": true }
```

### Update supplier (PATCH `/:id/supplier`)

```json
{ "supplier_id": 5 }
// or { "supplier_id": null } to unlink
→ document object
```

### Bulk unmark defective (POST `/bulk-unmark-defective`)

```json
{ "documentIds": [1, 2, 3] }
→ { "message": "N document(s) unmarked as defective", "count": N }
```

### Bulk retry (POST `/bulk-retry`)

```json
{ "documentIds": [1, 2, 5] }
→ { "message": "N document(s) re-queued", "queued": N }
```

Only documents with status `failed` are retried. Non-existent or non-owned IDs are skipped.

### Set document tags (PATCH `/:id/tags`)

```json
{ "tag_ids": [1, 3, 5] }
→ { "tags": [...] }
```

---

## Suppliers (`/api/suppliers`)

Read-only: suppliers are created automatically from parsed documents.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user suppliers |
| GET | `/:id` | Get supplier by ID |

**List query params**

| Param | Type | Description |
|-------|------|-------------|
| search | string | Filter by name |
| limit | number | Max results (default 50, max 500) |

**Response**
```json
{ "suppliers": [{ "id", "name", "vat_number", "address", "email", ... }] }
```

---

## Tags (`/api/tags`)

Tags are system-managed (due dates, etc.). User can assign tags to documents via document endpoints.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user tags |

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| limit | number | Max results |
| search | string | Filter by name |

**Response**
```json
{ "tags": [{ "id", "name", "color", ... }] }
```

---

## Stats (`/api/stats`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/overview` | General statistics |
| GET | `/trends` | Upload trend, type distribution, due dates, spending |

**Trends query params**

| Param | Type | Description |
|-------|------|-------------|
| days | number | Days for upload trend (default: 30) |

**Response (overview)**
```json
{ "totalDocuments", "parsedCount", "failedCount", "pendingCount", ... }
```

**Response (trends)**
```json
{
  "uploadTrend": [...],
  "typeDistribution": [...],
  "dueDateDistribution": [...],
  "spendingTrend": [...],
  "latestDocuments": [...]
}
```

---

## Email (`/api/email`)

Test endpoints for email templates (development/debug).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/test-success` | Send test "document processed" email |
| POST | `/test-error` | Send test "document error" email |

---

## Error responses

| Status | Format |
|--------|--------|
| 400 | `{ "message": "..." }` |
| 401 | `{ "message": "Not authorized" }` or `{ "message": "Invalid token" }` |
| 404 | `{ "message": "Document not found" }` etc. |
| 500 | `{ "message": "..." }` |

---

## Rate limiting (production)

- **Auth** (`/register`, `/login`, `/forgot-password`): stricter limit for brute-force protection
- **Stats**: 30 req/min
- **Document upload**: 50/day per user
- **Global**: applied to all requests
