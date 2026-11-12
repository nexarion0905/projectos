# ProjectOS production-readiness audit

> Historical baseline audit, captured before the Neon backend implementation. Its present-tense statements, test counts, Supabase plan and line references are superseded. Use `IMPLEMENTATION_STATUS.md`, `PRODUCTION_READINESS.md`, `SECURITY.md` and `OWNER_ACTIONS.md` for the current status and remaining release gates. This record is retained as evidence of the initial gaps.

## Executive summary

ProjectOS is ready for a local single-user pilot after the verified checks below. It is not production-ready as a public, multi-user workspace. The current web app is a client-only IndexedDB application with no account boundary, no server-side persistence, no sync, and no deployed environment. The Supabase schema is explicitly an unapplied template.

The highest priority work is to choose the launch target, implement server-side identity and workspace authorization, apply and test database policies in a dedicated Supabase project, add operational controls, and complete browser accessibility and end-to-end testing. The local agent has strong basic boundaries after recent fixes, but its restore and MCP workflows still need fixture-based integration tests before being called production-grade.

## Current verification

- `npm test`: 16 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with Next.js 16.4.6.
- `git diff --check`: passed.
- No production deployment, HTTPS service-worker test, remote Git restore fixture, Supabase deployment, or browser accessibility audit was performed.

## Release position

| Target | Status | Reason |
|---|---|---|
| Local single-user showcase | Near-ready | Core app, IndexedDB workspace, Local Agent CLI, restore guards, and metadata-only MCP are implemented. |
| Private internal pilot with important data | Not ready | No authenticated backup, recovery, device migration, monitoring, or tested restore process. |
| Public multi-user SaaS | Blocked | No server persistence, authentication, authorization, tenant boundary, sync, deployment, or operational controls. |

## Findings

### P0-1 — No production identity or tenant authorization boundary

**Severity:** Critical for a public or shared deployment  
**Location:** `features/core/database.ts:14-30`, `components/projectos.tsx:58-85`, `DEPLOYMENT.md:13-19`

**Evidence:** The app opens a browser-local Dexie database named `projectos-local`; the main component reads and writes it directly. The deployment document states that the app is not a multi-user hosted product and that the Supabase migration is not applied.

**Impact:** Hosting the current app publicly would provide a UI without accounts, workspace membership, server-side authorization, cross-device continuity, or recovery. Data is isolated by browser profile rather than by a server-enforced user or workspace identity.

**Required work:** Implement Supabase Auth or another server-side identity provider, a server-side data-access layer, workspace membership checks on every read/write, session and account recovery flows, and negative cross-tenant authorization tests. Keep local mode explicitly separate from cloud mode.

**Mitigation:** Treat the current build as local-only; do not advertise it as a hosted collaboration product or place sensitive shared data in it.

### P0-2 — Supabase schema is not a production persistence layer yet

**Severity:** Critical for cloud launch  
**Location:** `supabase/migrations/202611120001_projectos_workspace.sql:1-3`, `DATABASE.md:9`, `DEPLOYMENT.md:19`

**Evidence:** The migration identifies itself as a template and says it has not been applied remotely. The repository has no Supabase client, repository adapter, migration pipeline, or environment configuration.

**Impact:** There is no production database to persist, synchronize, authorize, back up, or recover workspace data. Applying the draft without dedicated-project review would create an unverified security boundary.

**Required work:** Select a dedicated Supabase project, apply the migration in development, run advisors, review every RLS policy with authenticated and unauthenticated cases, add schema migrations for all required product entities, and add rollback and backup procedures.

The draft also needs relational authorization tests before application. For example, `tasks.project_id` is a foreign key to `projects.id`, but the schema does not enforce that both rows have the same `workspace_id`; the same pattern appears in milestones, research records, and graph edges. RLS checks the submitted child row's workspace, so a malformed or malicious client could create cross-workspace references unless the repository layer or database constraints reject them.

### P1-1 — Production security headers are not configured in the app

**Severity:** High for public deployment  
**Location:** `next.config.ts:3-7`, `app/layout.tsx:4-17`

**Evidence:** The Next configuration only disables the powered-by header and enables React strict mode. There is no `headers()` configuration, proxy, middleware, or visible edge configuration for CSP, frame protection, referrer policy, or content type protection.

**Impact:** A public deployment has no repository-level guarantee for a baseline CSP or browser hardening headers. Platform defaults may help, but they are not visible or tested here.

**Required work:** Define and test a deployment header policy. At minimum, establish a CSP compatible with Next.js, `frame-ancestors`, `X-Content-Type-Options`, an appropriate referrer policy, and explicit handling for service-worker scope. Verify the actual response headers on the chosen host.

### P1-2 — No deployment, runtime, monitoring, or rollback evidence

**Severity:** High for production launch  
**Location:** `DEPLOYMENT.md:13-26`, `OWNER_ACTIONS.md:1-15`, `package.json:6-13`

**Evidence:** The deployment document says no deployment has been created or verified. There is no CI workflow, health check, error tracking, audit log pipeline, uptime monitor, backup job, release promotion process, or rollback runbook in the repository.

**Impact:** A release cannot be promoted, observed, recovered, or rolled back with evidence. Failures in storage, service-worker caching, browser compatibility, or the selected host would be discovered manually.

**Required work:** Choose Vercel or another host, add CI for install/typecheck/test/build, configure preview and production environments, add runtime error reporting and deployment health checks, define backup/retention and rollback procedures, and verify the production build over HTTPS.

### P1-3 — Data durability and migration are browser-local only

**Severity:** High for important user data  
**Location:** `features/core/database.ts:14-26`, `README.md:36`, `DEPLOYMENT.md:24-26`

**Evidence:** The database is a single local IndexedDB instance. The product documentation states that browser data remains device-local and that server hosting does not provide cross-device sync.

**Impact:** Clearing browser storage, changing browsers/devices, profile corruption, or a lost device can lose the workspace unless the user manually exports a backup. There is no automatic backup, conflict handling, or recovery guarantee.

**Required work:** Define the durability contract. For cloud mode, implement sync with conflict rules, versioned migrations, audit history, and recovery. For local mode, add tested backup reminders, import/export compatibility, corruption handling, and a documented recovery procedure.

### P1-4 — Browser accessibility and interaction quality are explicitly unfinished

**Severity:** High for a broad public launch  
**Location:** `ROADMAP.md:11-16`

**Evidence:** The roadmap still lists browser interaction, responsive, keyboard, and accessibility review as unfinished. The code has dialogs and custom graph controls, but no automated accessibility suite or browser end-to-end tests are present.

**Impact:** Keyboard navigation, focus trapping, screen-reader semantics, mobile layouts, and offline behavior may fail for users even though the production build compiles.

**Required work:** Add Playwright or equivalent browser tests for create/edit/delete/import/export/offline flows, run axe or equivalent checks, verify focus management in modals and command palette, test responsive breakpoints, and perform manual keyboard and screen-reader passes.

### P1-5 — Service-worker behavior is not production-verified and can serve stale shell content

**Severity:** Medium to high depending on release cadence  
**Location:** `public/sw.js:4-30`, `components/projectos.tsx:79-83`

**Evidence:** The service worker caches `/` and static assets, uses a fixed cache name `projectos-shell-v1`, calls `skipWaiting()` and `clients.claim()`, and is only registered in production. There is no versioned release coordination or browser test for update behavior.

**Impact:** Users can receive a stale application shell after a deployment. A cached shell can also mask a broken deployment until the cache is cleared.

**Required work:** Test install, update, offline fallback, cache invalidation, and rollback behavior over HTTPS. Version the cache with releases, coordinate worker activation with clients, and document recovery from a stale worker.

### P2-1 — Local Agent restore and MCP need integration coverage

**Severity:** Medium  
**Location:** `packages/local-agent/src/restore.ts:8-27`, `packages/local-agent/src/mcp.ts:7-18`, `ROADMAP.md:11-16`

**Evidence:** Unit tests cover manifest/path guards and early restore rejection, but no test clones a local Git fixture, checks out a pinned commit, validates mismatch behavior, starts the stdio MCP process, or exercises the client protocol. The roadmap still describes bounded file retrieval even though the implementation is now metadata-only.

**Impact:** The safety properties are source-reviewed but not proven across the real Git and MCP boundaries. Documentation can also cause operators to expect a removed file-reading capability.

**Required work:** Add local Git fixture tests for pinned and mismatched commits, process-level MCP protocol tests for both tools and unknown project IDs, and update the roadmap to say metadata-only MCP.

### P2-2 — Dependency and supply-chain maintenance is not operationalized

**Severity:** Medium  
**Location:** `package.json:17-34`, repository root

**Evidence:** Runtime dependencies use caret ranges and there is no visible dependency update policy, audit job, Dependabot configuration, lockfile verification step, or SBOM output.

**Impact:** Future installs can resolve newer transitive packages without a reviewed release decision, and known vulnerabilities may remain undiscovered between manual checks.

**Required work:** Keep `package-lock.json` authoritative with `npm ci`, add dependency audit/update automation, pin or review major upgrades deliberately, and generate an SBOM or equivalent release inventory.

### P2-3 — Local registry protection is platform-dependent and unverified on Windows

**Severity:** Medium  
**Location:** `packages/local-agent/src/registry.ts`

**Evidence:** The registry is stored as a JSON file under the user profile and attempts to apply mode `0600`. The security audit did not establish Windows ACL behavior for that mode or test concurrent filesystem changes.

**Impact:** The registry contains local project paths and manifests. On Windows, the POSIX mode request is not sufficient evidence of exclusive ACLs, and concurrent local changes were not tested.

**Required work:** Verify and enforce Windows ACLs or document the exact OS permission contract, add atomic write and recovery tests, and treat same-account access as a trusted local boundary.

## Remaining product work

- Decide whether the first release is strictly local or begins the hosted product; use one clear target in the implementation and marketing contract.
- Align browser records with Local Agent manifests if continuity is intended to be end-to-end.
- Add the proposed-scope review step before registration is persisted.
- Define backup, retention, deletion, export, and privacy policy before collecting user data.
- Replace demo/sample records with a clear first-run choice for an empty workspace versus demo mode.
- Verify browser compatibility, mobile viewport behavior, and service-worker behavior on the supported browser matrix.

## Recommended launch sequence

1. Freeze the local-only showcase scope and correct the roadmap's stale MCP wording.
2. Complete browser accessibility, responsive, service-worker, Git fixture, and MCP protocol tests.
3. Add CI, dependency monitoring, security headers, error reporting, and a verified preview deployment.
4. Create a dedicated Supabase project and implement Auth, repository access, RLS, sync, backups, and recovery tests.
5. Run a private pilot with recovery and rollback drills before public launch.

## Conclusion

ProjectOS has a credible local foundation and a passing build, but the production SaaS gates are still open. The honest release label today is "local-first development continuity prototype / private showcase," not "production multi-user workspace."
