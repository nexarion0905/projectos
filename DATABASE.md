# ProjectOS database

Neon PostgreSQL is the cloud database. IndexedDB remains device-local. The historical draft under `supabase/migrations/` uses Supabase-specific identity and has no role in Neon provisioning. No hosted ProjectOS migration has been verified.

## Stage the migration

1. Select an authorized ProjectOS staging branch with no production data. Inventory existing schemas and back up if populated. The active baseline in `db/migrations/0001_neon_projectos.sql` is written for a fresh schema. If any ProjectOS tables exist, stop and prepare a reviewed forward migration.
2. Run `npm test` to apply the migration in disposable PostgreSQL and exercise its authorization rules. Review the SQL and verify that the migration owner can create the group role. Use the direct TLS connection with `psql -X -v ON_ERROR_STOP=1 -f db/migrations/0001_neon_projectos.sql` after selecting the intended branch in the secure connection environment.
3. Using the migration administrator, create a separate SQL login with no administrative memberships, no object ownership, and no bypass-RLS privilege. Set its password via `psql \password` or an approved provider secret workflow, then grant `projectos_runtime` to that login. Put its pooled TLS URL in `DATABASE_URL`. Keep the migration connection separate from application settings.
4. Check effective privileges, inspect `pg_roles` and verify that the runtime login can set only the intended application role. Smoke-test health, two unrelated accounts, a Viewer, membership removal, and stale version rejection on staging.

The backend obtains the actor from a freshly validated Neon Auth session and passes it as a parameter in the same PostgreSQL transaction as the operation. Only the runtime group has the application's table privileges. The transaction actor setting is trusted server context and is not a safe boundary for direct SQL clients or a browser Data API. Fixed-search-path functions own the membership lookup and atomic workspace creation. Verified ProjectOS accounts are registered on first cloud workspace access, and owner and member references use foreign keys.

## Backup transfer

From Settings, export a local version 1 JSON backup, review it, then explicitly upload it in **Cloud workspaces**. A team upload shares the entire backup with members who can read that workspace. The server normalizes the payload, validates references and rejects inputs beyond 900 KB. Workspace IDs are scoped by the database. Writes use the last-read version and return 409 on conflicts. Refresh and compare the current download before a retry. Downloads leave IndexedDB untouched. The existing local import prompts before replacement.

The schema stores one latest snapshot per workspace. It does not supply version history or per-project authorization. No Supabase data was imported. If a legacy database is identified, export from an authorized read-only source, inventory/count records, validate IDs and references, map identities explicitly, and import into a disposable Neon branch before approval of any data transfer.
