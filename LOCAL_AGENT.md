# ProjectOS Local Agent

The first release Local Agent is a Node.js/TypeScript CLI, not a desktop application. It does not authenticate to a cloud service and does not upload files.

## Setup

From this repository, install dependencies with `npm install`. The commands below run the local TypeScript sources through `tsx`.

```powershell
npm run projectos -- doctor
npm run projectos -- inspect "C:\path\to\project"
npm run projectos -- inspect "C:\path\to\project" --name "My project" --output .\projectos.manifest.json
npm run projectos -- register "C:\path\to\project" --name "My project"
npm run projectos -- status
npm run projectos -- restore .\projectos.manifest.json --destination "C:\path\to\new-project"
```

`inspect` prints a manifest to stdout unless `--output` is provided. Output creation is exclusive: an existing manifest file is preserved. `register` stores local metadata in `%USERPROFILE%\.projectos\registry.json` (or the directory selected by `PROJECTOS_HOME`). Registry entries include local project paths and manifests, never credential values. `status` shows project metadata and roots.

## Manifest and inspection scope

The version 1 manifest contains only non-secret metadata. The inspector records a sanitized Git origin, branch, commit, detected runtime/package manager, filenames in the project layout, and environment variable names from `.env.example`, `.env.sample`, or `.env.template`. It never reads actual `.env` files for export. It excludes common caches/build folders, sensitive file names, symlinks, and paths ignored by `.gitignore`.

Review the generated manifest before sharing it. The file inventory is bounded to 300 paths; the inspector does not upload files or run scripts.

## Restore behavior

Restore accepts HTTPS and SSH Git remotes. It requires a full pinned commit hash and an existing parent directory. It claims a new destination before cloning, disables checkout hooks and checks out only the pinned commit. If clone or checkout fails, the new directory is preserved for inspection. Normal Git credential providers remain available. A Windows integration test covers register, manifest, clone and checkout from disposable Git storage.

## Current limits

The CLI is independent of the browser's cloud backup and team workflows. Device authorization, CLI sync and editor launch remain deferred. Local registration conveys only local process access.
