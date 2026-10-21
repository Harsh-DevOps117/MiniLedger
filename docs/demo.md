# Demo recording and interview walkthrough

## Generate the browser walkthrough

Start the Docker stack, install the test browser, and run:

```bash
npm ci
docker compose up --build -d --wait
npx playwright install chromium
npm run demo:record
```

The recording command also requires `ffmpeg` on your PATH. It saves `artifacts/demo/miniledger-demo.mp4`, a WebM source, a sample receipt and recording metadata. The demo runs for at least 137 seconds (about 2 minutes 17 seconds plus startup overhead), contains explanatory captions and has no audio. It uses a newly generated demo account and leaves the demonstrated entries in the local database. Use `E2E_BASE_URL` if the web host/port differs.

The export helper selects `libx264` when available and otherwise uses `libopenh264`; your FFmpeg installation needs one of those H.264 encoders. If recording succeeds but conversion fails, the WebM remains intact. Convert it without repeating the walkthrough:

```bash
node scripts/export-video.mjs artifacts/demo/YOUR_CAPTURE.webm
```

This is an actual recording of the Expo **browser build** talking to the Dockerized API and PostgreSQL. The caption and log overlays are added by the recording script only; they are not product features. The log overlay displays the actual mock OTP read from `docker compose logs api`. No API responses are faked. The receipt is explicitly marked as a sample, not a real bill.

Review the MP4 before uploading to Loom or Google Drive. If the assignment reviewer expects native execution, use the same walkthrough in Expo Go/a development build on a real phone and record that device instead. This repository does not claim an unperformed native test.

## Suggested 2–3 minute narration

| Time      | Show                                      | Explain                                                                                                              |
| --------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:15 | Login screen                              | “MiniLedger tracks small loans to friends. The client is React Native, with a TypeScript API and PostgreSQL.”        |
| 0:15–0:35 | Phone, API log, OTP verification          | “This assignment uses a mock OTP printed in the server log. Codes expire and cannot be reused.”                      |
| 0:35–1:00 | Create Aditi’s overdue entry with receipt | “The form validates the name, decimal amount and date. The optional photo is validated and stored privately.”        |
| 1:00–1:20 | Add Rohan’s future-due entry; summary     | “The API computes total lent, repaid and overdue. Due dates use UTC; money is stored as exact decimals.”             |
| 1:20–1:45 | Receipt view, overdue filter, repayment   | “Only this account can access its entries. A repayment is confirmed and repeated requests do not count twice.”       |
| 1:45–2:05 | Updated totals, refresh, search           | “Data persists in PostgreSQL and the session survives a refresh. Search and status filters help find entries.”       |
| 2:05–2:25 | Validation and sign-out                   | “Validation runs in both app and API. Docker Compose runs the database, migrations, API and browser preview.”        |
| 2:25–2:40 | Optional source/README                    | “The architecture guide explains each function. Tests cover concurrency, authorization, money and the full UI flow.” |

## Interview practice

Read one flow at a time. Start with the **Save entry** button in `AddLoanModal`, follow `ApiClient.create` to the route and service, then read the SQL insert. Repeat for OTP verification and repayment. Explain the reasons in your own words:

- Why does PostgreSQL calculate totals instead of the app?
- Why is an incorrect OTP returned as a transaction result rather than thrown inside the transaction?
- Why does a receipt query need `user_id` even if entry IDs are UUIDs?
- What happens if two repayment requests arrive together?
- What does Docker Compose wait for before starting each service?
- What would change before deploying mock login publicly?

Be candid about the use of AI tools and the parts you have run on a real phone. Understanding the implementation matters more than memorizing the terminology.
