# ProjectOS

ProjectOS is a development continuity workspace. Its primary local workflow is to inspect and register a project, export a portable non-secret manifest, restore a Git-backed project into a new folder, and expose approved local metadata to a coding agent through MCP. The browser app also includes optional project planning tools.

## What works

- A Node.js/TypeScript Local Agent for project inspect/register/status/restore/doctor.
- Versioned manifest export with Git metadata, runtime/package files, environment variable names, and bounded project layout.
- Git restore into a new destination only, with required full commit pinning and verification.
- Metadata-only local stdio MCP tools for listing projects and reading validated manifests.
- Neon backend integration layer for Managed Better Auth, protected workspace snapshots, and private Object Storage presigning; live provisioning remains owner-controlled.
- Project records with lifecycle status, priority, progress, categories, tags, and target dates.
- Task creation, status changes, completion/reopening, priorities, due dates, and project association.
- Milestones with completion and chronological timeline views.
- Research records with an explicit evidence scope, sources, project associations, and graph links.
- Knowledge graph for project/research nodes and user-created relationships.
- Dashboard and analytics derived from stored records; global search and `Ctrl/Cmd+K` command palette.
- Rules-based Command Center for workspace summaries, overdue and blocked work, and transparent priority suggestions.
- Versioned IndexedDB storage, offline application shell, versioned JSON import/export, local preferences, and demo-record removal.
- Audit activity for major record changes.

Sample content is marked `DEMO`. Conceptual ecosystem records are not represented as built products, research hypotheses are not presented as results, and cloud integrations are not claimed to be connected.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS 4, Dexie/IndexedDB, Zod, Vitest, and Lucide icons. The UI uses a custom responsive design system. No external API key is needed for local use.

## Requirements and setup

Use Node.js 20.9 or later and npm.

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>. The first visit creates clearly labeled sample records. Your own records remain in this browser's IndexedDB across reloads. The production service worker caches the shell after the first online load; local data remains available offline when the app shell has been cached.

## Commands

```powershell
npm run dev        # local development server
npm run projectos -- help # local agent commands
npm run mcp        # local stdio MCP server
npm run typecheck  # strict TypeScript check
npm test           # unit tests
npm run build      # optimized production build
npm start          # serve the production build
```

## Data, privacy, and limitations

- ProjectOS stores records in IndexedDB in the current browser profile. Clearing browser site data removes local records; export backups regularly.
- Import replaces this device's current workspace only after a confirmation and schema/integrity checks. Export creates a versioned JSON backup.
- “Reset demo data” removes sample records and preserves records you create.
- With Neon configured, **Cloud workspaces** lets verified accounts create workspaces, manage team memberships, and explicitly upload or download versioned JSON backups. Background sync, project-level access and private document handling are pending. Rules-based summaries run locally.
- The browser app and CLI keep separate local stores. Local registration does not create cloud backup or cross-device sync.
- Restore refuses existing destinations and does not run project setup scripts. The separate remote MCP resource requires a configured Neon OAuth provider and explicit account opt-in.
- `db/migrations/0001_neon_projectos.sql` is the active Neon schema and has not been applied remotely. The older `supabase/migrations/` draft is retained as historical design input only.

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [DATABASE.md](./DATABASE.md), [SECURITY.md](./SECURITY.md), [LOCAL_AGENT.md](./LOCAL_AGENT.md), [MCP.md](./MCP.md), [SYNC.md](./SYNC.md), [DEPLOYMENT.md](./DEPLOYMENT.md), and [OWNER_ACTIONS.md](./OWNER_ACTIONS.md).
