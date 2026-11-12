# ProjectOS implementation status

| Category | Scope |
| --- | --- |
| Implemented and verified locally | IndexedDB workspace and Git continuity. Disposable PostgreSQL runs the active migration and application queries, testing tenant isolation, viewer denial, immutable ownership, registered membership, revocation and stale writes. Stdio and remote MCP wire tests cover tool restrictions, token checks, tenant denial and access revocation with synthetic fixtures. See [release checks](PRODUCTION_READINESS.md). |
| Implemented but unverified against hosted services | Managed Better Auth registration, verification, login, logout, recovery, profile name editing and protected cloud page. Restricted Neon runtime login and transaction-scoped identity. Opt-in, versioned cloud backup transfer and team membership by verified account ID. |
| Partially implemented | Cloud persistence stores whole-workspace snapshots. Remote OAuth MCP is implemented behind an opt-in and configuration gate. Project-level ACLs and background sync remain open. Security headers, CI, dependency checks, health endpoint, and recovery and incident runbooks exist locally. |
| Blocked by external authorization | Publish source to a confirmed GitHub target, apply a staging migration, test live identity/MCP, deploy and inspect protected Vercel Preview, and enable remote monitoring and backup schedules. |
| Blocked by infrastructure | The connected Neon project's Auth has verification off and no trusted origins. Object Storage is unavailable in its `aws-eu-west-2` region. |
| Deferred | Project-level memberships, GitHub OAuth, device registration, invitation emails, credential references, security audit events, cloud backup history and automatic cross-device synchronization. |

The Supabase draft is preserved as historical input. Local Agent restoration checks out a pinned Git commit in a fresh directory. Dependency installation and editor/session restoration remain separate steps.

## Verification on 12 November 2026

`npm run typecheck`, `npm run lint`, 27 Vitest tests, `npm audit --audit-level=high` with zero findings, the production build and four Chromium browser tests passed on Windows. The disposable PostgreSQL engine validated the migration and executed the app's authorization SQL. A read-only query on the connected Neon production branch found no ProjectOS tables. The hosted Auth, database, MCP and storage flows were not exercised.
