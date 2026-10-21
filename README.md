# MiniLedger

A small, full-stack app for keeping track of money lent to friends. Built for the Full Stack Development internship assignment, due **24 October 2026**.

**React Native + Expo · Node.js + TypeScript · PostgreSQL · Docker Compose**

## What works

- Two first-launch onboarding pages with Next, Back, Skip and saved completion.
- Phone login with a six-digit mock OTP printed in the API log.
- Create a loan with a friend’s name, amount and a calendar-selected due date.
- Mark a loan fully repaid; repeating the request does not double-count it.
- Summary of total lent, repaid, outstanding and overdue amounts.
- Overdue highlighting, status filters, friend search, pagination and pull-to-refresh.
- Optional receipt photo upload and private receipt viewing.
- Shared validation, persistent native sessions, rate limits, tests and CI.

The app uses React Native components throughout. Its browser build is the same Expo app, included to make the assignment easy to review without a phone. Native Android/iOS execution still needs a compatible Expo Go installation or a native development build.

## Run everything with Docker

Requirements: Docker Engine/Desktop with Compose v2 or later. No host Node.js or PostgreSQL is required for this route.

```bash
cp .env.example .env
docker compose up --build -d --wait
docker compose logs -f api
```

Open **http://localhost:8080**. Enter a phone in international format, such as `+919876543210`. Click **Send verification code**, copy the `otp` value from the API log, then enter it in the app. There is no fixed OTP, SMS provider or pre-created account.

```json
{ "phone": "+919876543210", "otp": "123456", "msg": "MOCK OTP — development delivery only" }
```

The example code above is illustrative. Use the newly generated code from your own log.

| Service       | Default address       | Purpose                                         |
| ------------- | --------------------- | ----------------------------------------------- |
| Web           | http://localhost:8080 | Expo browser build served by unprivileged Nginx |
| API           | http://localhost:3000 | Express API; `/health` and `/ready`             |
| PostgreSQL    | localhost:5432        | Local database tools; bound to loopback         |
| Migration job | No public port        | Runs once before API startup                    |

Startup waits for PostgreSQL health, migration success, and API readiness. Entries and receipts persist in a named PostgreSQL volume. `docker compose down` stops the stack and preserves data. **`docker compose down -v` deletes the ledger database.**

### If ports are already in use

Change the following in `.env`, then rebuild:

```dotenv
DB_PORT=55432
API_PORT=3100
PORT=3100
DATABASE_URL=postgresql://miniledger:miniledger_local@localhost:55432/miniledger
EXPO_PUBLIC_API_URL=http://localhost:3100/api
```

`API_PORT` controls Docker’s host port; `PORT` controls a host-run API. The container always listens internally on 3000. `DATABASE_URL` is used by host commands; Compose sets its own connection string using the `db` service hostname. Change `WEB_PORT` and `CORS_ORIGINS` together if changing the browser port. Expo public environment values are embedded at build time, so rebuild the web image after changing its API URL.

## Run on a phone / develop locally

Requirements: Node.js 24, npm, Docker for PostgreSQL, and Expo Go compatible with the pinned SDK (57) or an Expo development build.

```bash
make setup
docker compose up -d db
npm run db:migrate
npm run dev:api
```

In another terminal:

```bash
# Edit this file before starting Expo:
cp apps/mobile/.env.example apps/mobile/.env
npm run dev:mobile
```

Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env`:

| Where the app runs      | API URL with default ports             |
| ----------------------- | -------------------------------------- |
| Browser / iOS simulator | `http://localhost:3000/api`            |
| Android emulator        | `http://10.0.2.2:3000/api`             |
| Physical phone          | `http://YOUR_COMPUTER_LAN_IP:3000/api` |

On a physical phone, both devices must share Wi-Fi and the host firewall must allow the API and Expo development server. Scan Expo’s QR code. `localhost` on your phone refers to the phone, not your computer. Restart Expo after changing its environment file. You can also keep Docker’s API running and only start `npm run dev:mobile`; do not start a second API on the same port.

`npm run dev:web` starts the browser development build, normally at http://localhost:8081. Shared contracts are built when the development command starts; rerun `npm run build:shared` after changing contract source.

## Tests and quality checks

```bash
npm ci
npm run check                 # ESLint, strict TS, unit tests, API build
npm run format:check
make test-integration        # Dedicated, disposable PostgreSQL database
# If 5433 is occupied:
make test-integration TEST_DB_PORT=55433

docker compose up --build -d --wait
npx playwright install chromium
npm run test:e2e              # Desktop and phone-sized browser workflows
```

Integration tests require `TEST_DATABASE_URL` and refuse to run unless its database name ends in `_test`. They truncate that database; they never fall back to `DATABASE_URL`. `make clean-test` removes the disposable test container. E2E tests use unique demo phone numbers and leave their sample entries in the local app database. E2E OTPs are read from the local Compose logs, never exposed through an API endpoint.

The tests cover invalid money/dates, exact sums, due-today boundaries, OTP expiry/replay/attempt limits, concurrent OTP requests and verification, concurrent repayment, cross-user isolation, receipt validation, pagination and readiness. Browser tests cover the complete login-to-repayment flow, persistence, filtering, validation and logout. They do not replace testing on a physical Android/iOS device.

## Project map

```text
apps/api/             Express routes, services, SQL repositories, migrations
apps/mobile/          Expo app, screens, reusable components, hooks, API client
packages/contracts/   Shared Zod schemas and request/response types
tests/                Unit, real-PostgreSQL integration and browser E2E tests
infra/                Static web server configuration
scripts/              Repeatable demo recording
arch.md               Architecture, design choices and function reference
plan.md               Implementation record, validation and remaining handoff
docs/api.md           Endpoint examples and error contracts
docs/demo.md          Recording instructions and interview walkthrough
docs/dependencies.md  Dependency audit notes and upgrade policy
```

## Business rules

- **Total lent** includes every entry, including repaid ones. **Total repaid** includes fully repaid entries. **Outstanding** is their difference. **Overdue** is unpaid money with a due date strictly before today in UTC.
- Money is INR for this assignment. PostgreSQL calculates with `NUMERIC`; the API uses decimal strings to avoid floating-point arithmetic. `0.10 + 0.20` stays `0.30`.
- Date-only values use `YYYY-MM-DD`. An entry due today is not overdue. Past dates are accepted for entering older loans.
- Repayment is full and final. Partial repayments, editing and deletion are deliberately outside this assignment.
- Receipt photos: JPEG, PNG or WebP, up to 2 MB and 12 megapixels. The API re-encodes them as JPEG, removes metadata and stores the result privately with the entry.
- OTPs expire in five minutes, have five verification attempts, and may be resent after 60 seconds. Tokens expire after one day. Sign-out clears the client session; tokens are not individually revoked server-side.

## Submission

The repository is prepared for GitHub, including CI and interview documentation. See [the demo guide](docs/demo.md) for a 2–3 minute walkthrough and the recording command. Upload the final recording to Loom or Google Drive and confirm the reviewer can view it. A browser recording is identified as such; record Expo Go on a phone if the reviewer requires a native demonstration.

Do not commit `.env`, logs, database files, or real financial data. Demo videos and screenshots live in ignored `artifacts/`. Publish the repository to your own GitHub account and include its actual link plus the actual Loom/Drive link in the submission; this project does not invent those links.

## Scope and operational limits

This is an internship demo with mock authentication. Anyone who can read its OTP logs can sign in. Before a public deployment, replace log delivery with a real SMS provider, use HTTPS and strong independent secrets, restrict database access, configure trusted proxies explicitly, and replace the in-memory IP limiter with a shared store if running multiple API replicas. Native sessions use SecureStore; the browser demo uses tab-scoped session storage. Receipt blobs are suitable for this small app; larger systems should use private object storage and signed access.

See [architecture and function guide](arch.md), [implementation record](plan.md), and [dependency notes](docs/dependencies.md) for the exact tradeoffs.
