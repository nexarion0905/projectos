# Roadmap

## Local continuity foundation — implemented

- Local Agent CLI for inspect, register, status, restore, and doctor.
- Versioned non-secret project manifest and bounded local file inventory.
- Git-backed restore into a new directory with commit verification.
- Read-only local stdio MCP tools for registered project metadata and validated manifests.
- Responsive browser workspace with optional planning and research support.

## Complete the local showcase

- Complete browser interaction, responsive, keyboard, and accessibility review.
- Align browser project records with imported/exported Local Agent manifests.
- Add an explicit user review step for the proposed scope before registration is persisted.

The CLI restore path has passed a local Git fixture test that checks out a pinned commit in a fresh destination.

## Neon cloud continuation

1. Create an authorized staging branch in the connected ProjectOS Neon project, configure verified email and trusted origins, create a restricted runtime login, and apply the reviewed migration there.
2. Verify registration, login, logout, recovery, workspace membership, snapshot persistence, and negative cross-tenant cases with two disposable accounts on the protected preview.
3. Add GitHub OAuth and server-side repository metadata access.
4. Enable the Neon OAuth provider on staging and test the implemented remote MCP with a real client. Add project-level grants and durable audit events.
5. Add device authorization and revocation, then backup/sync/restore history with explicit collision handling.
6. Integrate a credential provider for references and OS-local use; never expose raw values through MCP.
7. Select a storage-capable region or provider for private assets; the connected Neon project region does not support Object Storage.
8. Publish to an approved GitHub target and deploy a protected Vercel preview after the owner selects the target.

## Later

- Non-Git file backup and snapshots, conflict resolution, selective/background sync, editor launch, team invitations/roles, and hosted credential workflows.

Account, cloud, deployment, and team capabilities remain unverified against hosted services until these checks pass.
