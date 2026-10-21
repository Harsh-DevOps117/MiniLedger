# API reference

Base URL: `http://localhost:3000/api`. Use the configured host port when different. All successful responses and errors are JSON. Protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint                   | Authentication | Result                          |
| ------ | -------------------------- | -------------- | ------------------------------- |
| POST   | `/auth/request-otp`        | None           | 200: expiry and resend interval |
| POST   | `/auth/verify-otp`         | None           | 200: token and user             |
| GET    | `/loans?limit=20&offset=0` | Bearer         | 200: entries and next offset    |
| POST   | `/loans`                   | Bearer         | 201: created entry              |
| PATCH  | `/loans/:id/repay`         | Bearer         | 200: updated entry              |
| GET    | `/loans/summary`           | Bearer         | 200: money totals               |
| GET    | `/loans/:id/receipt`       | Bearer         | 200: private JPEG data URI      |
| GET    | `/health` (outside `/api`) | None           | 200: process alive              |
| GET    | `/ready` (outside `/api`)  | None           | 200/503: database reachable     |

## Login

```bash
curl -s http://localhost:3000/api/auth/request-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+919876543210"}'

# Replace 123456 with the OTP printed by `docker compose logs api`.
curl -s http://localhost:3000/api/auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+919876543210","otp":"123456"}'
```

Verification returns `{ "token": "...", "user": { "id": "uuid", "phone": "+919876543210" } }`. New users are created on the first successful verification. A code is consumed exactly once even when verification requests arrive together. OTP request responses never contain the code.

## Create and repay

```bash
# Assign the actual token returned above.
TOKEN='paste-token-here'
curl -s http://localhost:3000/api/loans \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"friendName":"Aditi Sharma","amount":"1250.50","dueDate":"2026-10-24"}'

# Optional receipt: same endpoint, multipart body.
curl -s http://localhost:3000/api/loans \
  -H "Authorization: Bearer $TOKEN" \
  -F 'friendName=Rohan Mehta' -F 'amount=500' -F 'dueDate=2026-10-24' \
  -F 'receipt=@/absolute/path/to/receipt.jpg'

curl -s -X PATCH http://localhost:3000/api/loans/ENTRY_UUID/repay \
  -H "Authorization: Bearer $TOKEN"
```

Loan shape:

```json
{
  "id": "uuid",
  "friendName": "Aditi Sharma",
  "amount": "1250.50",
  "dueDate": "2026-10-24",
  "status": "outstanding",
  "isOverdue": false,
  "hasReceipt": false,
  "createdAt": "2026-10-21T12:00:00.000Z",
  "repaidAt": null
}
```

`amount` is a string, positive, at most ten integer digits and two fractional digits. `friendName` is trimmed and 1–80 characters. Dates must be real calendar dates from 2000 through 2100. `status` and `isOverdue` are derived; clients cannot set them. Creating an entry is not idempotent: after a network timeout, refresh before retrying to avoid duplicates. Repayment is idempotent and preserves the original repayment timestamp.

## List, totals and photos

```bash
curl -s 'http://localhost:3000/api/loans?limit=20&offset=0' -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/api/loans/summary -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/api/loans/ENTRY_UUID/receipt -H "Authorization: Bearer $TOKEN"
```

List response: `{ "entries": [...], "nextOffset": 20 }`; the last page has `nextOffset: null`. Maximum page size: 100. Maximum offset: 1,000,000. Ordering is newest creation first, with UUID as a stable tie-breaker. Offset pagination can shift if new entries arrive between pages; refresh starts from the newest page. The client deduplicates appended entries.

Summary example:

```json
{
  "totalLent": "1750.50",
  "totalRepaid": "500.00",
  "outstanding": "1250.50",
  "overdueAmount": "1250.50",
  "currency": "INR",
  "asOf": "2026-10-21"
}
```

Photos return `{ "dataUri": "data:image/jpeg;base64,..." }` only after ownership checks. List responses do not contain image bytes. A loan belonging to another user is treated as missing (404). All API responses have `Cache-Control: no-store`.

## Errors

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check your input.",
    "details": [{ "field": "amount", "message": "Amount must be greater than zero" }]
  }
}
```

| Status | Typical cause                                           |
| ------ | ------------------------------------------------------- |
| 400    | Invalid input, bad UUID, malformed JSON, invalid image  |
| 401    | Missing/expired/invalid token; invalid or expired OTP   |
| 404    | Missing route, loan or receipt; another user’s resource |
| 413    | Oversized JSON or receipt                               |
| 429    | OTP cooldown, exhausted attempts, or IP rate limit      |
| 500    | Unexpected server failure; details are server-side only |

IP limits: 120 API requests/minute and 30 authentication requests/15 minutes. In addition, OTP cooldown and attempt counters persist in PostgreSQL. CORS allows only configured browser origins; authentication remains required independently of CORS.
