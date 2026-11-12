# ProjectOS implementation plan

Product priority follows the development-continuity specification. The browser app works locally; hosted cloud features require an authorized staging setup and live verification.

| Feature | Priority | Status | Verification / dependency |
|---|---|---|---|
| My Projects browser workspace and project planning tools | P0 supporting | Implemented locally | Typecheck, unit tests, production build |
| Local Agent inspect/register/status/doctor CLI | P0 | Implemented locally | Local filesystem safety tests |
| Versioned non-secret project manifest export and validation | P0 | Implemented locally | Manifest schema and exclusion tests |
| Git restore to a new destination with commit verification | P0 | Implemented and tested locally | Fixture clone checks out a pinned commit; existing-path guard tested |
| Local stdio MCP server | P0 | Implemented and tested locally | SDK-backed metadata tools tested over the stdio wire |
| Browser persistence and offline shell | P0 supporting | Implemented locally | Build and browser verification |
| Auth, private workspaces, teams, and server-side authorization | P0 | Application layer implemented; live verification pending | Existing ProjectOS Neon project needs a staging branch, verified email, restricted login, migration and two-account hosted tests |
| GitHub OAuth, cross-device device registration, and cloud sync | P0 | Deferred | Requires owner-approved app registration and backend |
| Remote Streamable HTTP MCP | P0 | Implemented behind configuration and account opt-in; live verification pending | Synthetic OAuth and tenant tests pass; enable Neon OAuth on staging, test a real client, then add durable audit storage and project-level grants |
| Credential vault and hosted file backups | Later | Provider boundary documented; storage presigning implemented but disabled | Existing Neon region has no Object Storage; select an authorized supported provider and key/access architecture |
| Protected preview and GitHub remote | P0 | Deployment configuration prepared; no hosted preview | Confirm GitHub publication target and Vercel project, then authorize protected preview |

## Implementation notes

- The operations and research screens remain optional planning support. They do not define the core product.
- A connected ProjectOS Neon project and a README-only GitHub repository were found. No remote account or database was changed.
- Do not present local browser records as a cloud account, device sync, backup, or team workspace.
