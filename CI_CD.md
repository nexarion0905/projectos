# CI and supply-chain checks

`.github/workflows/ci.yml` defines a Windows, Linux and macOS matrix for lockfile installation, type checking, lint, Vitest integration and dependency audit. Linux additionally builds and runs Playwright with Chromium. Workflows use read-only repository permissions and disable persisted checkout credentials. They contain no deployment credentials or automatic production promotion.

`.github/dependabot.yml` schedules npm and Actions version checks. Enable security alerts and updates in the repository settings. Set `PROJECTOS_CODEQL_ENABLED=true` only on a repository eligible for CodeQL, then verify a real run. Local dependency audit and behavioral security tests run regardless of CodeQL availability. Review dependency changes before merge.

Require the observed quality checks before enabling deployment. GitHub execution and branch protection are pending publication to the intended repository.
