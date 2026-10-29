# e2e — outside-in scenarios for this surface

End-user scenarios that drive the running app from the outside, on localhost, with
synthetic data. Run them with the shared skill `outside-in-e2e-testing`.

## Start, seed, sign in (fill these in; never guess them)

PENDING rows are filled by the environment bootstrap story (#40, priitkustala/ai-news#40) with the real commands and ports; nobody guesses them (LOCKED specification, section Local test environment, SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890).

| Step | Command | Address |
|---|---|---|
| Start the app locally | PENDING: #40 fills it | PENDING: #40 fills it |
| Seed synthetic data | PENDING: #40 fills it | |
| Development-only sign-in | PENDING: #40 fills it | |

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
