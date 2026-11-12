# ProjectOS release gate

**NOT READY FOR PUBLIC PRODUCTION**

Local checks on 12 November 2026 passed with 27 Vitest tests, four Chromium browser tests, type checking, lint, build and a zero-finding high-severity dependency audit. This evidence covers the local source and disposable fixtures.

| Gate | Current evidence |
| --- | --- |
| Authentication and tenant isolation | PostgreSQL role and RLS tests run locally. Provider registration, verification, expiry, logout and recovery require authorized staging. |
| Cloud persistence | Explicit JSON backup transfer and optimistic version checks exist. Live Neon app access, project-level sharing and storage verification remain open. |
| Local continuity and MCP | Pinned Git restoration and metadata-only stdio wire tests use synthetic fixtures. Remote MCP has synthetic issuer, audience, expiry, scope, tenant and revocation tests. Live OAuth and client-specific Codex/Claude checks are open. |
| Browser and CSP | Playwright covers Windows Chromium local project persistence, mobile navigation, the account form, enforced CSP, offline shell and cache pruning. Hosted flows and a complete accessibility audit are open. |
| CI and dependencies | Local checks and workflow configuration are available. Hosted CI, Dependabot activation and CodeQL require a confirmed repo. |
| Preview, HTTPS, recovery and monitoring | The connected Vercel team has no ProjectOS project. The existing Neon ProjectOS project has no staging branch and is in a region without Object Storage. Its Auth has verification disabled, no trusted origins and OAuth provider off. Health returns a minimal status and logs a redacted operation identifier. No live uptime, failure alert, backup schedule, hosted restore drill or rollback drill has been verified. |

For preview monitoring, configure uptime checks for protected staging using approved monitor access and for production once authorized. Alert on repeated health failures, server 5xx, Auth error rates, stale backups and failed deployments. Review client exceptions without capturing project content. Local Agent and MCP errors remain device-local. Do not log credentials, private request bodies, authorization headers or recovery links. Investigate using redacted operation names and deployment/time correlation.

See [the baseline audit](docs/PRODUCTION_READINESS_AUDIT.md), [owner actions](OWNER_ACTIONS.md) and [recovery runbook](BACKUP_AND_RECOVERY.md).
