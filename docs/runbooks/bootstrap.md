# Bootstrap Runbook

## Required Local Software

1. PHP 8.3+
2. Composer 2.x
3. Docker Desktop
4. Node 22+

## Backend Bootstrap

1. Create a fresh Laravel 12 app inside `apps/backend`.
2. Preserve and merge the existing `app`, `routes`, `database`, and `tests` structure from this repository.
3. Install Sanctum, configure Postgres, Redis, queues, broadcasting, and Reverb.
4. Bind interfaces to concrete repositories and payment services in service providers.
5. Add Spatie Permission or an equivalent RBAC implementation if the team prefers package-based role management.

## Frontend Bootstrap

1. Run `npm install` from the monorepo root.
2. Run `npm run dev:frontend`.
3. Replace mock product data with TanStack Query API hooks.
4. Add IndexedDB sync adapters for offline transactions and deferred stock writes.

## Production Hardening

1. Add CI for lint, type-check, tests, and build.
2. Add SAST and dependency scanning.
3. Add structured logging and request tracing.
4. Add backups and disaster recovery checks for Postgres.
