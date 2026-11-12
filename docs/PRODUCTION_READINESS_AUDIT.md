# ProjectOS production-readiness audit

Baseline before this release pass. ProjectOS uses Next.js App Router, React, TypeScript, npm and Vitest. Browser records use Dexie/IndexedDB. The Local Agent is a Node.js CLI and the MCP server was metadata-only stdio. The earlier Neon directive governs the active database choice. The Supabase migration is historical and remains unapplied. Current status is recorded in `IMPLEMENTATION_STATUS.md`.

| Severity | Baseline evidence and cause | Work and acceptance check |
| --- | --- | --- |
| Critical | `db/migrations/0001_neon_projectos.sql` has recursive and mis-scoped policies. `lib/server/workspace.ts` does not set a database identity, creates memberships separately and can demote owners. | Replace the unapplied policies, use a non-owner runtime role and atomic operations. Validate with distinct actors in disposable PostgreSQL. |
| Critical | `app/auth/[path]/page.tsx` has no reset-completion page. The broad proxy also covers API and PWA assets. | Complete provider flows, verify identity server-side and enforce JSON API errors. Exercise email and sessions on an authorized Neon branch. |
| Critical | Snapshot writes overwrite the latest version. The browser only uses IndexedDB. | Implement version checks and explicit upload/download through an authenticated workspace screen. |
| Critical | `app/api/storage/presign/route.ts` signs caller-chosen keys across workspaces and has no upload bound. | Allocate tenant-scoped unique keys, sign the size, and gate live storage until staging verifies signed constraints. |
| High | `next.config.ts` has no security headers. `public/sw.js` intercepts every navigation. | Enforce CSP with a nonce, disable private caching and constrain offline fallback. Verify response headers in a real browser. |
| High | Local Agent tests cover rejection cases but no successful checkout. MCP has no wire test. | Exercise Git against disposable repositories and MCP against its real stdio transport. Remote OAuth MCP remains a separate release gate. |
| High | No CI, lint command, dependency update configuration or browser tests. No Git remote or commits. | Add source-controlled checks and run them locally. Hosted checks require the intended GitHub repository. |
| High | Vercel project search returned no ProjectOS matches in the connected scope. No Neon environment credentials or project link were present. | Record protected preview setup, staging smoke tests, health checks, backup drills and rollback. Obtain the intended environments before hosted changes. |

Implementation order is database and identity boundaries, explicit cloud persistence, Local Agent and MCP verification, browser and CI gates, then protected preview and recovery verification.
