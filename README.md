# mfe-pot-dashboard-mfe

> **Disclaimer:** This is an independent proof-of-technology project, not
> affiliated with, endorsed by, or associated with Service Canada,
> Employment and Social Development Canada (ESDC), or the Government of
> Canada in any way. "MSCA-D" and any GC branding/design-system references
> are used only to ground the proof of technology in a realistic scenario.

The **MSCA-D** frontend for the mfe-pot Government of Canada MFE
proof-of-technology: cross-benefit overview, payment history, correspondence,
and "tell us once" profile maintenance. Federated as a remote into
`mfe-pot-msca-shell`; also exposes a standalone payment-history widget
embedded into `mfe-pot-life-events`.

This README covers running **this app (+ its BFF) standalone**. For the full
family (all 7 repos together) and architecture rationale, see
[`../mfe-pot-platform/README.md`](../mfe-pot-platform/README.md) and
[`CLAUDE.md`](./CLAUDE.md) in this repo.

## Prerequisites

- **asdf** with the `nodejs` plugin (`.tool-versions` pins the exact
  version — currently 22.22.0, anything ≥ 22.12 works).
- **pnpm** (not asdf-managed — install globally or via `corepack enable`).
- **A GitHub personal access token with `read:packages` scope**, exported as
  `NODE_AUTH_TOKEN` — `pnpm install` pulls `@tn4consulting/shared-*` packages
  from GitHub Packages (`.npmrc` in this repo points at that registry). `gh
  auth token` works as a substitute if you have `gh` authenticated.
- **Docker**, **kind**, **helm**, **kubectl** — only for the containerized
  loop below.

## Install & run standalone

```bash
export NODE_AUTH_TOKEN=<your GitHub token>
pnpm install
pnpm exec nx serve dashboard-bff   # terminal 1 — port 3004
pnpm exec nx serve dashboard-mfe   # terminal 2 — port 4201
```

Open `http://localhost:4201`. `dashboard-bff` fans out to `job-bank-bff` and
`employment-insurance-bff` for the overview tiles — without them running,
those tiles degrade to "unavailable" rather than erroring (see `CLAUDE.md`'s
partial-failure contract). Payments/correspondence are always real,
served from `dashboard-bff`'s own local data. Run the whole family via the
platform repo's README for the full cross-benefit picture.

## Test, lint, build

```bash
pnpm exec nx test dashboard-mfe
pnpm exec nx test dashboard-bff
pnpm exec nx lint dashboard-mfe
pnpm exec nx run dashboard-bff:eslint:lint   # BFF's lint target isn't named "lint"
pnpm exec nx build dashboard-mfe --configuration=production
pnpm exec nx build dashboard-bff
```

Or across this repo's projects at once: `pnpm run test` / `pnpm run lint` /
`pnpm run build`.

## Build & run the Docker images standalone

```bash
docker build --secret id=npm_token,src=<(printf '%s' "$NODE_AUTH_TOKEN") \
  -t mfe-pot-dashboard-mfe:local -f apps/dashboard-mfe/Dockerfile .
docker build --secret id=npm_token,src=<(printf '%s' "$NODE_AUTH_TOKEN") \
  -t mfe-pot-dashboard-bff:local -f apps/dashboard-bff/Dockerfile .

docker run -p 8080:80 mfe-pot-dashboard-mfe:local
docker run -p 3004:3004 -e HOST=0.0.0.0 mfe-pot-dashboard-bff:local
```

## Deploy this app's Helm chart locally (kind)

```bash
pnpm deploy:local
```

Runs `tools/deploy-local.sh`: builds both images, creates/reuses a local
`kind` cluster (shared with the other app repos, named `kind`), and
`helm upgrade --install`s `charts/dashboard-mfe` (one Helm release for both
the frontend and `dashboard-bff`). Requires `../mfe-pot-platform` checked
out as a sibling (this chart's library-chart dependencies resolve via
`file://../../../mfe-pot-platform/charts/...` relative paths). Add to
`/etc/hosts`:

```
127.0.0.1 dashboard-mfe.mfe-pot.local
```

Then `curl -H "Host: dashboard-mfe.mfe-pot.local" http://localhost/` or browse
there directly. In a pure single-app `kind` deploy, `dashboard-bff`'s
overview tiles that depend on the other services will show `unavailable` —
deploy `mfe-pot-job-bank-mfe`/`mfe-pot-employment-insurance-mfe` into the
same cluster too for the full picture (see the platform repo's README).

## Where to go next

- [`CLAUDE.md`](./CLAUDE.md) — this repo's specific gotchas (the BFF
  fan-out/partial-failure contract, the payment-history widget's federation
  exposes, Renovate).
- [`../mfe-pot-platform/CLAUDE.md`](../mfe-pot-platform/CLAUDE.md) — the
  full architecture reference for the whole family.
- [`../mfe-pot-platform/README.md`](../mfe-pot-platform/README.md) —
  running all 7 repos together.
