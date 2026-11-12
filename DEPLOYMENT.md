# ProjectOS deployment

Use Node 24, npm and the repository root with Vercel's Next.js preset. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm audit --audit-level=high`, `npm run build`, then install Chromium with `npx playwright install chromium` and run `npm run test:browser`.

## Protected preview

1. Use the confirmed Vercel project and a preview branch. Enable Vercel Authentication with Standard Protection. For free-plan use confirm the provider's current eligibility and limits.
2. Configure preview-only values from `.env.example`. Set `PROJECTOS_ORIGIN` to the exact browser origin and `PROJECTOS_CLOUD_REQUIRED=true`. Use a scoped Neon staging runtime login, distinct cookie secret, trusted origin and separate Auth branch. Leave storage disabled until signed upload limits, private reads, and quotas have been tested.
   The current `neon.ts` provisions Auth only. The connected project is in a region without Neon Object Storage, so bucket configuration needs a supported target.
   To test remote MCP, enable the branch's OAuth provider, register the exact HTTPS `/mcp` URL, use `/auth/sign-in` and `/auth/consent` for its pages, and set `PROJECTOS_MCP_RESOURCE`. Validate a real client authorization and revoke it from Cloud workspaces after testing.
3. Deploy the verified commit to Preview and inspect the build and logs. Check that anonymous access meets the preview protection expectation and that authenticated requests use HTTPS. Inspect CSP and response headers, including `Cache-Control: private, no-store` on private responses.
4. From two isolated browser contexts use disposable accounts to exercise verification, login, account updates, password reset and logout. Create personal and team workspaces, add a verified account ID as Viewer, verify read-only access, and remove it. Confirm unrelated accounts cannot read or write snapshots even with the workspace UUID. Upload from two tabs at the same version and confirm the stale write returns 409.
5. Check `/api/health` for HTTP 200 and `mode: cloud`, then test auth and private writes independently. Health probes connectivity and the runtime role. It does not verify SMTP, storage or account flows.

To automate the authenticated portion on a disposable preview, run `npm run test:staging` with `PROJECTOS_STAGING_SMOKE=true`, the exact `PROJECTOS_STAGING_URL`, and a preview-only Vercel browser state file selected by `PROJECTOS_STAGING_STORAGE_STATE` under ignored `.auth/`. Inject the two pre-verified disposable accounts through `PROJECTOS_STAGE_OWNER_EMAIL`, `PROJECTOS_STAGE_OWNER_PASSWORD`, `PROJECTOS_STAGE_VIEWER_EMAIL`, and `PROJECTOS_STAGE_VIEWER_PASSWORD`. Keep this state and these credentials outside source control and test artifacts. The test leaves one synthetic team and backup in the disposable environment. Email delivery, verification, expiry and recovery are still separate preview checks.

HSTS for a production domain is a separate verification step. Confirm HTTPS for the intended host and add an appropriate policy without preload or subdomain scope until those domains are reviewed. Nonce-based production CSP applies to HTML entry points. Inline styles are allowed for the current charts and graph. Scripts do not allow inline code without a nonce or `unsafe-eval` in production.

Preview and production must have separate credentials. Keep deployment promotion manual until the production gate passes and the exact action is authorized. [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection) · [Instant Rollback](https://vercel.com/docs/instant-rollback)
