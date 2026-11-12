# Sync and restoration

## Current continuity path

The implemented path is local registration → versioned manifest export → Git clone into a new folder → required pinned commit checkout and verification. Git remains the source-code version history. The separate browser cloud screen supports manual versioned backup transfer when Neon is configured. See [DATABASE.md](DATABASE.md).

The Local Agent skips symlinks, common generated directories, sensitive files, and `.gitignore` matches during bounded layout inspection. Manifest records contain repository metadata and environment variable names, never secret values. Restore does not run package manager hooks or other project scripts.

## Collision and failure handling

Restore rejects an existing destination before invoking Git and does not replace existing data. A failed clone/checkout may leave a newly created directory; it is kept for review rather than removed automatically. The CLI reports whether the checked-out commit matches the manifest. It cannot restore unsynchronized working tree changes, private repository credentials, LFS content unavailable to Git, secrets, IDE state, or revoked remote resources.

## Deferred sync system

Cross-device sync, non-Git files, versioned object storage, integrity-checked backup records, background sync, conflict UI, device authorization, and restore history require a configured ProjectOS backend and storage policy. This repository does not claim those features are working.
