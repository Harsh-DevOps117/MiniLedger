# MiniLedger implementation record

Status date: **22 October 2026**. Assignment deadline: **24 October 2026**.

## Scope and assumptions

Build the required phone/OTP login, loan creation, repayment and summary API with a React Native app. Add Dockerization, receipts, validation and meaningful tests. Use INR, whole-loan repayment and UTC date cutoffs. Prioritize understandable modules and explicit transactions over infrastructure that the assignment does not need.

## Work completed

| Stage             | What was done                                                                                            | Reason                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Workspace         | Created npm workspaces for API, mobile app and contracts                                                 | Shared types/validation without coupling screens to SQL    |
| Data model        | Added users, OTP challenges, loans, indexes, checks and checksummed SQL migrations                       | Durable state and invariants enforced by PostgreSQL        |
| Authentication    | Added random mock OTPs, HMAC storage, cooldown, expiry, attempts, atomic consumption and JWTs            | Meet the assignment while handling replay and concurrency  |
| Loan API          | Added creation, paginated listing, exact summaries, idempotent repayment and ownership checks            | Correct money totals and account isolation                 |
| Receipt bonus     | Added limited multipart uploads, image normalization and private photo retrieval                         | Useful bonus with atomic loan/photo persistence            |
| React Native UI   | Added login, summary, entry list, overdue highlighting, add form and repayment confirmation              | Complete reviewer-visible flow                             |
| UX details        | Added loading/error/empty states, search, filters, refresh, pagination and photo preview                 | Make failures and ordinary interactions understandable     |
| Session handling  | SecureStore on native; session storage on web; expiry and logout handling                                | Persist login without embedding token logic in screens     |
| Docker            | Added multi-stage API/web builds, PostgreSQL volume, migration job, health checks and configurable ports | Reproducible startup from a clean checkout                 |
| Code quality      | Strict TypeScript, ESLint, Prettier, shared helpers and dependency injection                             | Keep code consistent, reusable and explainable             |
| Tests             | Unit, real PostgreSQL integration and desktop/mobile browser workflows                                   | Test risky behavior and the complete user path             |
| CI                | Added GitHub Actions for formatting, lint, types, build, unit/integration tests and Docker browser tests | Repeat local checks on pushes and pull requests            |
| Documentation     | Added README, API guide, this record, `arch.md`, dependency notes and demo guide                         | Run instructions plus function-level interview preparation |
| Recording tooling | Added a paced browser recording script with explanatory captions and MP4 export                          | Reproducible 2–3 minute walkthrough of real app behavior   |

## Validation

- 24 unit tests passed: money and date validation, receipt decoding, invalid uploads and configuration.
- 17 PostgreSQL integration tests passed: auth, exact totals, concurrency, ownership, pagination, receipts and operational safeguards.
- Two browser E2E scenarios passed: desktop Chromium and a phone-sized Chromium viewport.
- TypeScript, lint and API compilation passed.
- Docker API, PostgreSQL and web containers reached healthy state; migration job completed successfully.
- Visual review identified a compact-summary sizing issue; the compact cards were adjusted to size to their content.
- After the documentation, compact-card fix and Manrope integration, lint, TypeScript, the 24 unit tests, 17 integration tests and both browser scenarios passed again.
- Browser inspection confirmed Manrope was loaded and used by the phone input. The original SDK 58 build used its variable-weight range; the SDK 57 adaptation uses explicit static Regular, SemiBold and Bold faces.
- Android and iOS production JavaScript/Hermes bundles exported successfully with the bundled font. This verifies bundling, not execution on a physical device.
- The API/contracts production dependency audit reported zero vulnerabilities. Expo build-tool findings remain documented separately.
- The browser demo was recorded with real login, receipt upload/viewing, loan creation, repayment, validation and logout. The local MP4 is in `artifacts/demo/miniledger-demo.mp4`; external Loom/Drive upload remains a submission step.

Native Android/iOS execution has not been verified in this workspace. A phone-sized browser test is not a native test. CI has been configured but cannot be reported as a passing remote GitHub run until the repository is published and the workflow executes.

## Local environment adjustments

This machine already uses ports 3000, 5432 and 5433 for unrelated containers. Those services were left running. The ignored local `.env` uses API port **3100**, database port **55432** and browser port **8080**. Integration tests use **55433**. Committed examples retain conventional defaults; the README documents port overrides.

## Deliberate limits

The user supplied a Manrope variable font during implementation. It was moved into the mobile app's assets, converted to a native-compatible TTF without changing its glyphs, and applied consistently through reusable typography components. No font copy remains at the repository root.

- Mock OTPs are delivered to logs, not SMS. No fixed bypass code exists.
- No partial repayments, editing, deletion, interest, reminders or multi-currency conversion.
- A successful POST whose response is lost can be repeated accidentally; the app asks users to refresh after a timeout. A production extension would add persisted idempotency keys.
- Search/filtering applies to currently loaded rows; the UI explains this and offers older pages. Production search would be server-side.
- Separate list/summary requests may briefly differ during concurrent edits. They converge on refresh.
- IP limits are per process; phone cooldown/attempt counts persist in PostgreSQL. Multiple API replicas need a shared IP limiter.
- Logout clears the client token; a copied token remains valid until its one-day expiry. Token revocation is outside the demo.
- Dependency audit findings in the Expo toolchain are documented rather than hidden by a forced incompatible downgrade.

## Submission handoff

### Expo SDK 57 compatibility update

At the user's request, the app now targets Expo **57.0.31**, React Native **0.86.3** and React **19.2.3**. Expo modules and React types were aligned with `expo install --fix`. Manrope's loading uses the SDK 57 map API and static weight files derived from the user's original font. The development server is restarted with a cleared Metro cache, and the LAN API URL remains configured in the ignored mobile `.env` file. The previously recorded demo shows the same app flow before the SDK downgrade.

A clean dependency reinstall removed leftover SDK 58 native modules and regenerated the lockfile. `expo install --check` reports compatible versions and `expo-doctor` passes all 21 checks without duplicate native modules. Lint, strict TypeScript, the 24 unit tests and API compilation pass. Android and iOS production bundles export successfully, and the live development manifest reports `sdkVersion: 57.0.0` with a successfully served Android bundle.

Both desktop and phone-sized browser E2E scenarios also pass against the SDK 57 Metro server. The Docker browser image has been rebuilt with the same SDK 57 dependencies.

### Phone keyboard visibility fix

The user reported that the keypad covered the phone-number input. Login and the add-entry modal now explicitly adjust height on Android and padding on iOS. A shared `KeyboardFormScrollView` measures and reveals the focused field after keyboard/layout changes, with safe-area-aware login positioning and a 20-point gap above the keypad. This also covers OTP input and switching fields while the keyboard is already open. The implementation uses Expo Go-compatible React Native APIs; physical-device keyboard behavior still needs confirmation on the user's phone.

TypeScript, lint and browser regression checks pass. Android and iOS production bundles export successfully with the keyboard and onboarding changes.

### Calendar due-date picker

Replaced typed due dates with a reusable `DateField`. Users tap a date in a month grid, navigate previous/next months, choose Today or close without changing the date. Opening the calendar dismisses the keypad. The existing API validation and UTC date-only storage stay in place. Browser flow tests and the recording script now select calendar days, including navigation when a sample date crosses a month boundary.

Following feedback about scrolling, the calendar now occupies its own view within the existing Add entry modal, with a fixed six-row grid. It no longer expands the form. Selecting a day, closing the calendar or pressing Android Back restores the form with entered values intact. The form no longer uses animated focus scrolling; bounce and overscroll effects are disabled, with manual overflow scrolling retained for small screens and the keyboard. Login's keyboard visibility fix remains active.

### Two-page onboarding

Added a first-launch introduction using the existing Manrope typography, green palette and native React Native components. The first page introduces recording a friend, amount and due date; the second explains summaries, overdue highlighting and marking repayments. Sample ledger cards are explicitly labeled and do not create data or imply automatic notifications.

Next and Back navigate locally; Skip and Get started save completion through a small platform storage module. Native uses SecureStore and web uses localStorage. Storage failures leave login accessible. Authenticated sessions go directly to the ledger. To preview again in development, remove `miniledger.onboarding.v1` from the corresponding store; signing out alone does not reset completed onboarding. Browser end-to-end coverage walks both pages, returns with Back, finishes and reloads; a separate case covers Skip persistence. All four desktop/mobile-browser scenarios pass, along with TypeScript and lint. The demo recorder skips the introduction to preserve its existing walkthrough timing.

1. Open the app and review the code with `arch.md` before the interview.
2. Run Expo on a compatible Android/iOS device if a native demonstration is required.
3. Publish this source directory to the intended GitHub repository; verify CI on that remote.
4. Review the generated MP4 or record the app on a phone, then upload it to Loom/Google Drive with reviewer access.
5. Submit the actual GitHub and recording links by **24 October 2026**.

No remote repository or externally hosted recording link is claimed here. The source and recording tooling are prepared locally; external publication requires the destination/account to be selected.
