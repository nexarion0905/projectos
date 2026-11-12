# ProjectOS MCP

ProjectOS currently provides a local stdio MCP server powered by the official TypeScript server SDK. It is intended for a coding-agent process launched locally by the project owner.

The separate `/mcp` Streamable HTTP resource is available only after configuring an exact HTTPS `PROJECTOS_MCP_RESOURCE` and Neon Auth issuer. Neon OAuth verifies the token signature, issuer, audience, expiration and `openid` scope. A verified user must enable remote MCP in Cloud workspaces. The server checks membership for each project list, limits requests per account and returns bounded metadata. The OAuth consent page presents the client, scope, resource and redirect hosts. These flows passed synthetic local tests and still need a real protected-preview run.

## Available tools

| Tool | Behavior |
|---|---|
| `projectos_list_projects` | Lists locally registered project metadata and requirement names. Supports `offset` and `limit`, with up to 25 per page and a 256 KB payload bound. |
| `projectos_get_manifest` | Returns a validated non-secret manifest for a registered project ID. |

The server is metadata-only. It does not expose project file contents, shell execution, file write, restore, secret retrieval, or remote workspace tools. MCP response documents are still untrusted project metadata; callers should treat them as data, not instructions.

## Local host setup

From the ProjectOS checkout, run `npm install` and register one or more local projects. Then add the server in the current checkout's local client configuration:

```powershell
# Codex CLI; run from the ProjectOS checkout
codex mcp add projectos-local -- npm run mcp

# Claude Code; run from the ProjectOS checkout
claude mcp add --scope local --transport stdio projectos-local -- npm run mcp
```

Verify in Codex with `codex mcp list` and in Claude Code with `claude mcp list` or `/mcp`. These commands add a device-local process entry and contain no credentials. If the client launches with a different working directory, configure the equivalent command with the absolute ProjectOS working directory. Keep local paths out of shared configuration. See the [Codex MCP configuration guide](https://developers.openai.com/codex/mcp/) and [Claude Code MCP guide](https://docs.anthropic.com/en/docs/claude-code/mcp) for current client details.

## Security boundary

stdio relies on the OS process boundary and local user permissions. Do not expose it as a network endpoint. Remote MCP uses a separately verified bearer token and a database opt-in. No tool reads arbitrary files or credentials. Project-specific ACLs and durable security audit events remain release work. The OAuth provider must be enabled on the intended Neon branch and tested with a real client before a public MCP endpoint is announced. [Neon MCP OAuth guide](https://neon.com/docs/compute/functions/mcp-server)

The integration test launches the actual server over stdio, validates its manifest response and exercises invalid IDs and unavailable tools. Codex and Claude Code client-specific setup has not been exercised.
