# Security architecture and limits

## Protected assets and trust boundaries

- Local registry: project names, local root paths, and non-secret manifests. Stored for the current OS user; no credential values are stored.
- Project source tree: treated as untrusted input. The Local Agent uses an explicit project root, excludes symlinks and configured ignore paths from inventory, validates relative reads, and bounds MCP responses.
- Git remotes: manifest values are parsed and restricted to HTTPS/SSH before restore. Restore requires a full pinned commit and Git is invoked with argument arrays, never through a shell string.
- MCP: local stdio exposes project metadata and manifests. The separate remote resource exposes workspace and project metadata through Neon OAuth and a per-user database opt-in.
- Restore destination: must not exist. The agent never runs cloned project code or scripts.
- Browser storage uses local IndexedDB. Cloud backups use a separate Neon session boundary, server-derived identity, explicit role checks and PostgreSQL RLS. Membership applies to the whole snapshot.
- Auth and cloud routes bypass the local offline cache. Private API responses are marked no-store.

## Credential handling

The manifest contains required environment variable names, not values. The inspector reads only sample/template environment files to identify names. `.env*`, key/certificate file paths, and common credential filenames are excluded. No MCP tool returns a secret, and no secret vault is implemented.

## Known limits

Local stdio trusts the user and process that launch the server. The registry is not encrypted or a secure credential store; it contains local paths and metadata only. Filesystem checks reduce traversal and symlink access but do not provide isolation from malicious processes running as the same OS user. The browser app remains local IndexedDB by default, while the Neon backend layer provides the pending cloud auth and tenant boundary. Do not deploy a multi-user service until a Neon project is authorized and backend auth, authorization, RLS, request auditing, secure session handling, and security tests are verified against it.

## Security verification

Local tests cover secret exclusion, Git restoration, MCP tool restrictions, synthetic OAuth signature, issuer, audience, scope and expiration checks, access revocation, request origin and size validation, and PostgreSQL cross-tenant isolation under a non-owner role. Provider cookie behavior, live Neon grants, storage policy and hosted remote MCP authorization remain release gates.
