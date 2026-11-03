# ai-news frontend

Canonical rule file of this repository. `CLAUDE.md` only imports it. Read it before any
work here. Changes to this file are reviewed in a pull request like code.

## What This Repository Is

The iPhone app of ai-news: the owner reads AI-specific news in it. It talks to the backend only through the backend's published interface. Backend services are not in this repository; they live in `ai-news-backend`.

- Language/runtime: TypeScript, compiled by tsc 7.0.2, for the browser; a plain installable browser client (OD-06 A); the scripts run on Node 22 (OD-03)
- Frameworks: none; Tailwind CSS 4.3.3 with basecoat-css 1.0.2 (OD-45); @supabase/supabase-js 2.117.2 for the data interface and sign-in
- Deployment: the static files of `dist/`; the release host (Firebase Hosting, OD-22) is set up at Release and run; nothing is deployed by #40
- Owning team: ai-news; team context: `ai-news-team-context`

## Build, Test, Run

Filled by the environment bootstrap story (priitkustala/ai-news#40). "Box" is this
repository's dev container, from the repository root. The local stack (the Supabase
interface `http://ai-news-api:8000` and the command relay `http://ai-news-commands:8090`)
belongs to ai-news-backend and is started there first (its `AGENTS.md`, Build, Test, Run,
row Start the stack); this box joins its network `ai-news-local`. The bindings live in the
git-ignored `.env.local` (names in `e2e/README.md`, section Variables the scenarios read).

| Task | Where | Command |
|---|---|---|
| Install | box | `npm ci --ignore-scripts` and `cd e2e && npm ci` |
| Browser for the scenarios, once per box | box | `cd e2e && npx playwright install webkit`, then its system libraries: `sudo -E env PATH="$PATH" apt-get update && sudo -E env PATH="$PATH" npx playwright install-deps webkit` (apt through the box's gateway: `deb.debian.org` and `security.debian.org` are on the allowlist; repeat after the box is rebuilt) |
| Build and type check | box | `npm run build` (tsc strict, Tailwind CSS, then `scripts/build.mjs` writes `dist/` with `SUPABASE_URL` and `PUBLISHABLE_KEY` of `.env.local`) |
| Serve the client | box | `npm start` (`http://localhost:3000`, loopback only; stop with Ctrl+C) |
| Seed a fixture set | box | `node scripts/backend-command.mjs seed <fixture-set> <run-marker>` (through the backend's relay) |
| Development sign-in, client | box, client served | `node scripts/app-sign-in.mjs owner <storage-state-file>` (or `second-user`) |
| Development sign-in, token | box | `node scripts/backend-command.mjs sign-in owner` |
| Scoped scenarios | box | `node scripts/run-scenarios.mjs --project=iphone --grep "@story-40"` (serves `dist/`, runs, stops the server) |
| One scenario | box | `node scripts/run-scenarios.mjs --project=iphone tests/bootstrap/40-40-f-client-loads-with-manifest.spec.ts` |
| Unit and integration tests | - | none yet: no unit-tested module exists; the first feature story adds the runner as an approved dependency |
| Lint and format | - | none approved yet; the type check is `npm run build` (strict) |

### A story's own instance (priitkustala/ai-news#65)

The rows above are for the repository folder `ai-news-frontend` and stay as they are. A story
can instead work in its own instance: a separate clone `ai-news-frontend-<key>` next to it in
the project folder (`<key>` is the story key in lower case, `s-03`, or a task's issue number,
`65`), with its own branch and box, paired with one backend: a backend instance
`ai-news-backend-<key>` (a story of both repositories, or a dedicated backend at main) or the
repository folder `ai-news-backend` (frontend-only stories of a wave share one backend at main).
`<folder>` is `ai-news-frontend-<key>`, `<backend>` the paired backend's folder and `<network>`
its pair network: `<backend>-local` for a backend instance, `ai-news-local` for the repository
folder. The paired backend is started first, with its keys written (its `AGENTS.md`, Build, Test,
Run, A story's own instance).

| Task | Where | Command |
|---|---|---|
| Create | host, Git Bash, the project folder | `git clone --no-hardlinks --no-checkout --branch main ai-news-frontend <folder>`, then in `<folder>`: `git fetch --no-tags ../ai-news-frontend "+refs/remotes/origin/main:refs/remotes/origin/main"`, `git remote set-url origin https://github.com/priitkustala/ai-news-frontend.git`, `git reset --hard refs/remotes/origin/main` (GitHub main as the checkout knows it; no git network command) |
| `.env.local` of the instance | host, the project folder | the commands below the table: the instance's own `/workspaces/<folder>/` paths and the paired backend's local publishable key, copied from `<backend>/.env.local` without printing it; never overwrite an existing file |
| Start the box | host, `<folder>` | `AI_NEWS_NETWORK=<network> sandbox` (the box joins only the paired backend's network; `docker network inspect <network>` must exist first) |
| Branch | box | `git fetch origin --prune`, `git switch -c <issue>-<slug> --no-track origin/main` |
| Install | box | as above: `npm ci --ignore-scripts` and `cd e2e && npm ci` |
| Browser for the scenarios | box | as above, once per box: `cd e2e && npx playwright install webkit`, then `sudo -E env PATH="$PATH" apt-get update && sudo -E env PATH="$PATH" npx playwright install-deps webkit` |
| Build and type check | box | as above: `npm run build` (reads `SUPABASE_URL` and `PUBLISHABLE_KEY` of the instance's `.env.local`) |
| Seed, sign in | box | as above: `node scripts/backend-command.mjs seed <fixture-set> <run-marker>`, `node scripts/backend-command.mjs sign-in owner` (both reach the paired backend's relay) |
| Scoped scenarios against the paired backend | box | `node scripts/run-scenarios.mjs --project=iphone --grep "@story-<n>"` |
| State of the instance's box | host, `<folder>`, any time after Start the box | `AI_NEWS_NETWORK=<network> docker compose -p ai-news-frontend-<key>_devcontainer -f .devcontainer/docker-compose.yml -f .devcontainer/docker-compose.override.yml ps` (the frontend instance's own project `<folder>_devcontainer` only; `<network>` is `<backend>-local` for a backend instance) |
| Stop the instance's box | host, `<folder>`, when the story pauses or before Remove | `AI_NEWS_NETWORK=<network> docker compose -p ai-news-frontend-<key>_devcontainer -f .devcontainer/docker-compose.yml -f .devcontainer/docker-compose.override.yml stop` (stops only the frontend instance's containers; the paired backend keeps running, because its stack is its own project; start again with Start the box) |
| Remove, after the owner merged the instance's pull request | box, then host | box: `git status --porcelain` prints nothing, and `git rev-parse HEAD` equals the `headRefOid` of `gh pr list --repo priitkustala/ai-news-frontend --head <branch> --state merged --json headRefOid`; otherwise stop. Host, `<folder>`: `AI_NEWS_NETWORK=<network> docker compose -p <folder>_devcontainer -f .devcontainer/docker-compose.yml -f .devcontainer/docker-compose.override.yml down -v` (the instance's containers, its own networks and node_modules volume; the paired backend's network and the external `agent-*` volumes stay), then from the project folder `rm -rf <folder>`. Remove the frontend instance before its paired backend instance |

The instance's `.env.local`, from the project folder on the host (Git Bash; prints only the names):

```
f=<folder>; b=<backend>
[ ! -e $f/.env.local ] && [ "$(grep -c '^PUBLISHABLE_KEY=' $b/.env.local)" = 1 ] && (umask 077; {
  echo "# Local bindings of $f, paired with $b. Local values only; never commit."
  grep '^PUBLISHABLE_KEY=' $b/.env.local
  echo "SUPABASE_URL=http://ai-news-api:8000"
  echo "E2E_BASE_URL=http://localhost:3000"
  echo "E2E_BUILT_CLIENT_DIR=/workspaces/$f/dist"
  echo "E2E_APP_SIGNIN_COMMAND=node /workspaces/$f/scripts/app-sign-in.mjs {persona} {file}"
  echo "E2E_BACKEND_COMMAND=node /workspaces/$f/scripts/backend-command.mjs"
  echo "E2E_DATA_URL=http://ai-news-api:8000/rest/v1"
  grep '^PUBLISHABLE_KEY=' $b/.env.local | sed 's/^PUBLISHABLE_KEY=/E2E_PUBLISHABLE_KEY=/'
  echo "E2E_FIXTURE_FEED_URL=http://ai-news-feeds:8081/feeds/techcrunch-ai.xml"
  echo "E2E_OD08=undecided"
  echo "E2E_RUN_TIME_ZONE=UTC"
} > $f/.env.local) && grep -v '^#' $f/.env.local | cut -d= -f1
```

## Protected Areas

- `AGENTS.md`, `CLAUDE.md`, `.github/`, `CODEOWNERS`: change only in a pull request
  whose purpose is that change; the owner reviews it.
- CI configuration, dependency lockfiles and anything holding configuration of
  secrets: stop and ask before changing.
- Secrets, tokens and keys never enter this repository, a prompt or memory.

## Local Conventions

- One story per session. Work starts from an approved story (issue) and a task brief
  (`docs/task-brief.md`).
- A bug or side issue found on the way is staged as a separate proposed item for the
  owner; the story in hand is not widened.
- Branch per story; changes reach `main` only through a pull request the owner
  reviews and merges. No agent merges, releases or deploys.
- Repository work, from the branch through commits, push, pull request, review and
  the steps after the merge, follows the project skill `github-flow` in the team
  context store (`.agents/skills/github-flow`); Claude Code loads it with the Skill
  tool, Codex CLI reads its `SKILL.md`.
- Every pull request fills `.github/PULL_REQUEST_TEMPLATE.md`, and carries the label
  `ai-assisted` when any part was produced by an agent.
- Tests use seeded test data only, never real personal data.

## How to Verify: Done When

- `npm run build` exits 0.
- The scoped scenarios of the story pass, and the scoped regression
  `--grep "@journey-<journey>"` of each touched journey shows no other change.
- The diagnostic or before-build evidence the regression contract requires is attached
  to the pull request.

## Starting a Session Here

This repository is part of the ai-news project and is meant to be checked out inside
the project folder, next to `ai-news-team-context/`.

1. Read this file.
2. Read the team's front door, `../ai-news-team-context/AGENTS.md`, and load the
   shared context: from the project folder run `python scripts/session-context.py --text`
   (handoff, operating contract, notes).
3. Inside the dev container only this repository is mounted writable. The team
   context is mounted read-only at `/workspaces/ai-news-team-context` and the
   testing skill at `/workspaces/.skills/outside-in-e2e-testing`; read the front
   door and `rules/regression-contract.md` from there.
   The `github-flow` skill is read inside the box at
   `/workspaces/ai-news-team-context/.agents/skills/github-flow/SKILL.md`.
4. If the team context cannot be read at all (a clone on its own), stop and say
   so. Do not start work that the missing rules govern.

## Quality Assurance

- The team's testing rules: `../ai-news-team-context/rules/regression-contract.md`.
- Outside-in scenarios live in `e2e/` and cover the app's screens at iPhone size (`@surface-app`, project `iphone`). Run them with the
  shared skill `outside-in-e2e-testing` (preflight, start on localhost, tagged run,
  report by journey).
- Scenarios are written from a story's acceptance criteria before implementation and
  must first fail on their assertion.
- How to start, seed and sign in locally: `e2e/README.md`, section Start, seed, sign in.

## Autonomous Runs: the Sandbox

- Unattended or auto-accept work runs only inside this repository's dev container:
  run `sandbox` from this folder in Git Bash. On the host, commands and file changes
  are reviewed before they run.
- `.devcontainer/` belongs to this repository. The egress allowlist is the
  `x-extra-allowed-domains` anchor in `.devcontainer/docker-compose.yml` and changes
  only through a reviewed diff. Additions so far: `auth.openai.com`, `chatgpt.com`, `api.openai.com` (the second-vendor agent); `cdn.playwright.dev`, `playwright.download.prss.microsoft.com` (browser builds for the scenarios); `deb.debian.org`, `security.debian.org` (WebKit's system libraries, priitkustala/ai-news#40).
- Inside the box, use git there and not on the host checkout. No production
  credentials enter the box.
- Identities: attended sessions may use the owner's own sign-in. Unattended runs
  need scoped tokens and `AGENT_REQUIRE_AUTH=1`, so the boot check refuses a bad
  credential; which tokens, and whether the owner's personal identity is ever
  acceptable unattended, is an open owner decision (the template's boot check only
  warns about a personal identity).
- `sandbox` starts Claude Code in the box. Starting the Codex generator in the box
  is not yet validated; see the workspace's `runs/ai-news-app/harness.md`, section 7.

## Where the Rest Lives

- Team domain, decisions, specifications and memory: `ai-news-team-context` (bound by
  `.memspec.yaml` in this repository).
- The operating contract, the lifecycle and the roles: the ai-news workspace's
  contract record in that store.
- The standard this repository follows: the Agentic SDLC guidance kept in the ai-news
  workspace under `inputs/agentic-sdlc-guidance/` (not redistributed here).
