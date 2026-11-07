# e2e — outside-in scenarios for this surface

End-user scenarios that drive the running app from the outside, on localhost, with
synthetic data. Run them with the shared skill `outside-in-e2e-testing`.

## Start, seed, sign in (fill these in; never guess them)

Filled by the environment bootstrap story (priitkustala/ai-news#40) with the real commands and ports (LOCKED specification, section Local test environment, SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890). Commands run in this repository's dev container from the repository root. The backend's stack is started first, in ai-news-backend (its `AGENTS.md`, row Start the stack). The full table is in `../AGENTS.md`, Build, Test, Run.

| Step | Command | Address |
|---|---|---|
| Start the app locally | `npm run build`, then `npm start`; or `node scripts/run-scenarios.mjs <playwright arguments>`, which serves `dist/` for one scenario run and stops it | client `http://localhost:3000`; local Supabase interface `http://ai-news-api:8000` (Data API `/rest/v1`, Supabase Auth `/auth/v1`); command relay `http://ai-news-commands:8090` |
| Seed synthetic data | `node scripts/backend-command.mjs seed <fixture-set> <run-marker>` | |
| Development-only sign-in | `node scripts/app-sign-in.mjs owner <storage-state-file>` (the client's own sign-in screen; saves a Playwright storage state); a token only: `node scripts/backend-command.mjs sign-in owner` | |

The rows above are the repository folder form. A story's own instance (priitkustala/ai-news#65),
the separate clone `<folder>` = `ai-news-frontend-<key>` paired with one backend `<backend>` (a
backend instance `ai-news-backend-<key>` on its network `<backend>-local`, or the repository folder
`ai-news-backend` on `ai-news-local`), uses the same commands in its own box at `/workspaces/<folder>`;
only the start, the `.env.local` and the key's way in change (create, `.env.local`, the key and removal: `../AGENTS.md`, Build,
Test, Run, A story's own instance). The paired backend's stack is started first, with its keys.

| Step | Command | Address |
|---|---|---|
| Start the app locally (instance) | host: `AI_NEWS_NETWORK=<backend>-local sandbox` from `<folder>` (`AI_NEWS_NETWORK=ai-news-local` or unset when paired with the repository folder), after its `.env.local` is written; then box: `npm run build`, then `npm start`, or `node scripts/run-scenarios.mjs <playwright arguments>` | client `http://localhost:3000` in that box; the paired backend's `http://ai-news-api:8000` and `http://ai-news-commands:8090`, reachable only on its own network |
| Seed synthetic data (instance) | box of `<folder>`: `node scripts/backend-command.mjs seed <fixture-set> <run-marker>` (seeds the paired backend's database) | |
| Development-only sign-in (instance) | box of `<folder>`: `node scripts/app-sign-in.mjs owner <storage-state-file>`; a token only: `node scripts/backend-command.mjs sign-in owner` | |
| State and stop of the instance's box | host, from `<folder>`: `AI_NEWS_NETWORK=<backend>-local docker compose -p ai-news-frontend-<key>_devcontainer -f .devcontainer/docker-compose.yml -f .devcontainer/docker-compose.override.yml ps` (state; `AI_NEWS_NETWORK=ai-news-local` when paired with the repository folder), the same with `stop` in place of `ps` (stop; the paired backend keeps running); `../AGENTS.md`, rows State of the instance's box and Stop of the instance's box | |

## Variables the scenarios read

They live in the git-ignored `.env.local` at the repository root; `e2e/playwright.config.ts`
loads that file, and a value already set in the environment wins (priitkustala/ai-news#40).
The publishable key is the exception: `PUBLISHABLE_KEY` and `E2E_PUBLISHABLE_KEY` stand in no
file. The orchestrator's secrets feed, run with `AI_NEWS_PAIR_BACKEND=<backend>`, puts them in
the box agent's environment from the paired backend's memory (priitkustala/ai-news#93), so a
second shell in the box, such as a `docker exec`, does not have them. `SUPABASE_URL` and
`PUBLISHABLE_KEY` are the two values the client build reads. An older `.env.local` that still
holds the key keeps working until priitkustala/ai-news#94. In a story's own instance
(priitkustala/ai-news#65) the three paths below read `/workspaces/<folder>/` instead of
`/workspaces/ai-news-frontend/`; the other values are the same.

| Name | Value |
|---|---|
| `E2E_BASE_URL` | `http://localhost:3000` (the built client, served by `npm start` at the repository root) |
| `E2E_BUILT_CLIENT_DIR` | `/workspaces/ai-news-frontend/dist` (the folder `npm run build` writes and `npm start` serves) |
| `E2E_APP_SIGNIN_COMMAND` | `node /workspaces/ai-news-frontend/scripts/app-sign-in.mjs {persona} {file}` (signs the seeded persona in through the client's own sign-in screen and saves the browser state as a Playwright storage-state file) |
| `E2E_BACKEND_COMMAND` | `node /workspaces/ai-news-frontend/scripts/backend-command.mjs` (relays `seed`, `ingest` and `sign-in` to the backend's development-only command relay `http://ai-news-commands:8090`; any other subcommand is refused there) |
| `E2E_DATA_URL` | `http://ai-news-api:8000/rest/v1` (the local Supabase interface's Data API, through the gateway) |
| `E2E_PUBLISHABLE_KEY` | the local publishable key, the same value as `PUBLISHABLE_KEY`, in the environment only (never the hosted project's, never committed) |
| `E2E_FIXTURE_FEED_URL` | `http://ai-news-feeds:8081/feeds/techcrunch-ai.xml` (the backend's fixture feed server; no scenario of this repository reads it, and it is on the backend's internal network only) |
| `E2E_OD08` | `undecided` (OD-08 is open; no scenario of this repository reads it) |
| `E2E_RUN_TIME_ZONE` | `UTC` (a test variable; OD-09 stays open) |

## Run

```
npm ci                               # once; installs the pinned test runner from package-lock.json
npx playwright install webkit        # once per machine; ask before installing
npx playwright test --grep "@story-<n>"      # scoped
npx playwright test                           # full suite
```

## Conventions

- One scenario per runnable observation row of the sprint 02 coverage matrix, in
  `tests/<journey>/<key>-<ac>-<suffix>-<short-name>.spec.ts` (rule and examples in
  `tests/README-testids.md`, section File names).
- Tags on every scenario: `@journey-<name>`, exactly one surface tag (`@surface-app`,
  `@surface-job` or `@surface-data`; `@surface-api` is kept for the scaffold's
  predicate), and `@story-<n>` or `@bug-<n>`. `@surface-app` runs in the `iphone`
  project; `@surface-job` and `@surface-data` run in the `api` project, without a browser.
- The variables the helpers in `support/` read (`E2E_BACKEND_COMMAND`, `E2E_DATA_URL`,
  `E2E_PUBLISHABLE_KEY`, `E2E_RUN_TIME_ZONE` and the others) are listed in
  `tests/README-testids.md`; #40 writes their values here.
- Elements are found by `data-testid` only. Waits are assertions, never fixed sleeps.
- No `.only`, `.skip` or `.fixme`. A scenario is never weakened, skipped or deleted to
  get a pass.

## Journeys and their tags

| Journey | Tag | Covers |
|---|---|---|
| access | `@journey-access` | Every read and write of the exposed schema needs the owner's sign-in; no secret leaves its store. Rows here: AC-20e. |
| bookmark | `@journey-bookmark` | The owner bookmarks and unbookmarks items and hears the status change. Rows here: AC-15a, AC-15b, AC-15e, AC-24a, AC-24b, AC-24c. |
| bootstrap | `@journey-bootstrap` | The local environment starts with seeded synthetic data (the #40 bootstrap checks). Rows here: 40f. |
| briefing | `@journey-briefing` | The owner reads the daily briefing of a run date (conditional on OD-08). Rows here: AC-13a, AC-13b. |
| filter-category | `@journey-filter-category` | The owner reads the category list with counts and narrows the feed to one category. Rows here: AC-11a, AC-11b, AC-19. |
| install | `@journey-install` | The client is installed and launched as a Home Screen web app. Rows here: AC-23a, AC-23b. |
| offline | `@journey-offline` | The owner reads cached items and bookmarks with no network. Rows here: AC-16a, AC-16b, AC-16c. |
| open-article | `@journey-open-article` | The owner opens one item in the article view and reaches the original. Rows here: AC-12. |
| push | `@journey-push` | The owner subscribes to the daily push notification or refuses it (conditional on OD-08). Rows here: AC-14a, AC-14b. |
| read-feed | `@journey-read-feed` | The owner opens and reads the headline feed and its states (last-updated, Stale, Error). Rows here: AC-03a, AC-03b, AC-09, AC-10a, AC-10b, AC-10c, AC-17, AC-18a, AC-18b, AC-21b, AC-26a, AC-26b, AC-26d, AC-26e, AC-26f, AC-27b, AC-28a, AC-28b. |

## Named manual checks (owner, on the real iPhone, release gate)

What only the real iPhone can show is checked by the owner by hand at the release gate, on the Firebase Hosting address of OD-22; these are never reported as agent passes (LOCKED specification, section Local test environment, Named manual steps). Rows marked with a coverage row are the manual rows of the sprint 02 coverage matrix (kind manual, project none); the others are the rest of the release list.

| Check | What the owner does and sees | Criterion | Coverage row |
|---|---|---|---|
| M1 | Records the iOS version of the iPhone | AC-23 (B-23) | AC-23 M1 (S-18) |
| M2 | Safari, Share, Add to Home Screen, Open as Web App on, Add | AC-23 (B-23) | AC-23 M2 (S-18) |
| M3 | Launching from the icon opens it as a web app, not a Safari tab | AC-23 (B-23) | AC-23 M3 (S-18) |
| M4 | The feed with images and categories | B-09, B-10, B-11 (AC-09, AC-10, AC-11) | release list only |
| M5 | Bookmarks after quit and relaunch | B-15 (AC-15) | release list only |
| M6 | Airplane Mode after reading online, relaunch from the icon: the Offline banner, cached headlines, summaries as shown and bookmarks readable, as AC-16 | AC-16 (B-16) | AC-16 M6 (S-19) |
| M7a | Push, if OD-08 chooses it: from the Home Screen icon, after subscribing, one test notification arrives and a rerun on the same date sends none | AC-14 (B-14), CONDITIONAL on OD-08 | AC-14 M7a (S-15) |
| M7b | Briefing date, if OD-08 chooses the briefing | B-13 (AC-13), CONDITIONAL on OD-08 | release list only |
| M8 | With VoiceOver on, the feed, a category, an article and the bookmark control are announced and the bookmark change is spoken | AC-24 (B-24) | AC-24 M8 (S-16) |
| M9 | Bookmarks and offline items after several days unused | B-15, B-16; R-02 | release list only |
