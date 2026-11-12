# Local development continuity showcase

The supported local showcase demonstrates real local data. It does not simulate accounts, cloud sync, or authentication.

1. Start the web app with `npm run dev`; sample planning records are marked as demo data.
2. Inspect a real project: `npm run projectos -- inspect "C:\path\to\project" --output .\projectos.manifest.json`.
3. Review the generated manifest. Confirm it contains repository and requirement metadata only, with no secret values.
4. Register the local project: `npm run projectos -- register "C:\path\to\project"`.
5. On a clean machine with access to the Git remote, restore to a new path: `npm run projectos -- restore .\projectos.manifest.json --destination "C:\path\to\new-project"`.
6. Confirm the CLI verifies the checked-out commit, then inspect the restored folder before opening it in an editor.
7. Launch `npm run mcp` through a local MCP host and retrieve a registered project's manifest or a bounded text file.

Successful cross-device restoration depends on a reachable HTTPS/SSH Git remote and owner-approved repository access. The browser has local and cloud workspace routes, with explicit backup transfer when Neon is configured. GitHub OAuth, device authorization, automatic sync and hosted backup history remain open. Remote MCP requires Neon OAuth configuration and account opt-in.
