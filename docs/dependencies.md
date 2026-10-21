# Dependency notes

The project pins direct API/tooling versions and commits `package-lock.json`. Expo's SDK-compatible native dependencies retain the ranges selected by `expo install`; the lockfile fixes the actual installation. Use Node.js 24 and `npm ci` for reproducible installs. Avoid `npm audit fix --force`: it may replace the Expo/React Native version with an incompatible older SDK.

## Audit findings observed during implementation

The app currently targets Expo **57.0.31**, React Native **0.86.3** and React **19.2.3**, with native module versions selected by `expo install --fix`. The SDK 58-only font family loading API was replaced with SDK 57-compatible static font maps.

The initial SDK 58 audit reported the following underlying advisories, with additional parent-package findings inherited through the dependency tree. This is a historical record; rerun the commands below for the current SDK 57 dependency graph:

| Dependency                   | Advisory                                                                                | Exposure and handling                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `braces` 3.0.3               | [Pattern nesting denial of service](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)  | Transitive Metro file-matching/build dependency; no compatible patched version was returned by the registry check during implementation |
| `node-forge` 1.4.0           | [RSA signature verification parsing](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | Expo CLI/code-signing dependency; the API does not use it or RSA signing                                                                |
| `uuid` 7.0.3 through `xcode` | [Output-buffer bounds issue](https://github.com/advisories/GHSA-w5hq-g745-h8pq)         | Expo native project tooling; the app does not invoke the affected buffer-based UUID APIs                                                |

These findings are **not fixed or dismissed** by this project. Re-run `npm audit` when preparing the submission and update the upstream toolchain as compatible fixes become available. The final API image installs only API/contracts runtime dependencies and excludes Expo, Metro, Xcode tooling and TypeScript. The final web image contains static compiled assets and Nginx, not the Node-based Expo CLI. This narrows deployment exposure but does not make the development/build environment free of risk.

Suggested checks:

```bash
npm audit
npm audit --omit=dev --workspace=@miniledger/api --workspace=@miniledger/contracts
cd apps/mobile
npx expo install --check
```

Build untrusted code only in an isolated environment. For native signing/publishing, review current Expo advisories and updates first. This assignment uses local mock authentication and makes no claim of production security certification.

## Primary documentation

- [Expo SDK reference](https://docs.expo.dev/versions/latest/) and [upgrade workflow](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).
- [Docker Compose startup ordering](https://docs.docker.com/compose/how-tos/startup-order/): the stack uses health and successful-completion dependencies.
- [PostgreSQL numeric types](https://www.postgresql.org/docs/17/datatype-numeric.html) and [explicit locking](https://www.postgresql.org/docs/17/explicit-locking.html).

The architecture and implementation are described in [arch.md](../arch.md); this file records the dependency tradeoffs separately so they are not confused with application behavior.
