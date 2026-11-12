# ProjectOS architecture

## Product boundary

ProjectOS is organized around development continuity. Its first working slice is local: inspect a project, register its path, export a portable manifest, restore a Git repository into a new directory, and expose local metadata to an MCP client. Project planning, research, and graph records in the browser app are supporting features.

## Components

- `app/` and `components/projectos.tsx`: Next.js browser workspace. Planning records persist in browser IndexedDB via Dexie; this application has no account session and does not connect to the Local Agent registry.
- `packages/local-agent/src/manifest.ts`: Zod-validated manifest, Git metadata inspection, environment-name extraction, bounded file inventory, ignored/sensitive-path filtering, and safe relative-file resolution.
- `packages/local-agent/src/registry.ts`: device-local registry under the OS user's home directory (or `PROJECTOS_HOME`). Stores project paths and manifests, never secret values.
- `packages/local-agent/src/restore.ts`: HTTPS/SSH Git clone to a new path, required full commit checkout, and exact verification. Does not execute project code.
- `packages/local-agent/src/mcp.ts`: official MCP TypeScript SDK stdio server with metadata-only project listing and manifest retrieval.
- `features/core/`: browser record types, Dexie persistence, deterministic summaries, backup validation, and sample records.
- `db/migrations/`: active, unapplied Neon schema for a dedicated ProjectOS service.
- `supabase/migrations/`: historical, unapplied design input retained for traceability.

## Trust boundaries and data flow

The local agent receives an explicit root path from its owner. It stores path/metadata locally and never uploads it. Manifest parsing is runtime validated and contains names/relative paths, not project contents or secret values. MCP exposes only registered project metadata and validated manifests; it has no project-file content tool. Git remote values are sanitized and restricted to HTTPS/SSH for restore; Git is invoked without a shell. Restore requires a full pinned commit, refuses existing destinations, and never executes repository setup scripts.

The browser's local workspace uses IndexedDB. Cloud workspaces are a separate, authenticated route with explicit JSON backup transfer. The server validates the Neon session and applies workspace RLS using a dedicated transaction role. Local PostgreSQL tests cover workspace isolation. Hosted verification and project-level authorization are open.

## Persistence model

The browser's versioned local model contains projects, tasks, milestones, research, graph records, audit events, and preferences. The Local Agent has an independent JSON registry. The exported manifest is portable and versioned, but its current version is not yet connected to a cloud `project_manifests` record.

## Future service boundary

Any future project-level API must scope child identifiers to the owning workspace. Remote Streamable HTTP MCP uses a verified Neon OAuth resource token and reads only workspace-scoped metadata after user opt-in. GitHub OAuth, devices, storage, secret references, and durable audit records need separate scoped integrations.
