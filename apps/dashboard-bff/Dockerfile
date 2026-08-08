# syntax=docker/dockerfile:1
#
# Built from this repo's own root, post Phase 1 extraction (see the
# platform repo's docs/plans/20260801-1935-mfe-pot-polyrepo-split-and-k8s-hosting.md).
# Same shape as apps/job-bank-bff/Dockerfile in the sibling mfe-pot-job-bank
# repo, which this was copied from -- see its comments for the fuller
# story on the fixes below.
#
# This is a single-package Nx "integrated" workspace, not a per-project
# pnpm workspace -- Nx's `prune`/`prune-lockfile` executors expect the
# latter and fail here. So this copies the full workspace node_modules
# into the runtime stage rather than a pruned subset -- fine at this
# repo's scale since it only depends on the pinned @tn4consulting/shared-*
# packages plus this BFF's own runtime deps (express, cors).
#
# Unlike job-bank-bff/employment-insurance-bff, this BFF calls out to
# OTHER apps' own BFFs (job-bank-bff, employment-insurance-bff) and
# client-profile-service over real HTTP -- see src/config.ts's
# JOB_BANK_BFF_URL/EMPLOYMENT_INSURANCE_BFF_URL/CLIENT_PROFILE_SERVICE_URL
# env vars (defaulting to localhost for `nx serve`). The Helm chart sets
# these to the other apps' in-cluster Kubernetes Service DNS names
# (<service-name>.<namespace>.svc.cluster.local), not their public
# Ingress hostnames -- this is genuine service-to-service traffic within
# the cluster, not routed back out through Ingress. If a target Service
# doesn't exist (e.g. client-profile-service, which has no chart in the
# platform repo yet), the call fails and that upstream's tile degrades
# gracefully per the partial-failure contract already built into
# overview.ts -- an accepted, working-as-designed gap, not a bug.
FROM node:22-alpine AS build
WORKDIR /workspace
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json tsconfig.json .npmrc ./
RUN --mount=type=secret,id=npm_token \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    NODE_AUTH_TOKEN="$(cat /run/secrets/npm_token)" pnpm install --frozen-lockfile --network-concurrency=4
COPY apps ./apps
COPY libs ./libs
COPY tools ./tools
RUN pnpm exec nx build dashboard-bff --configuration=production

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# The Express server binds process.env.HOST (default 'localhost' in
# main.ts, meant for local dev) -- inside a container that must be
# 0.0.0.0, or the Pod's Service can never reach it despite the process
# looking healthy from inside its own container.
ENV HOST=0.0.0.0
COPY --from=build /workspace/dist/apps/dashboard-bff ./
COPY --from=build /workspace/node_modules ./node_modules
EXPOSE 3004
CMD ["node", "main.js"]
