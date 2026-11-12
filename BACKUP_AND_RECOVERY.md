# Backup and recovery

## Proposed operating schedule

- Before each migration and once daily, create an encrypted PostgreSQL logical export to a private backup location with restricted restore access. Keep 7 daily copies and 4 weekly copies if storage and policy permit. Keep object storage backups separate from the database and catalog their checksums.
- Review the actual Neon plan's restore window and Auth and Object Storage recovery scope. Managed restore is independent of the local IndexedDB export. Verify whether the selected Auth branch and bucket are covered by each procedure.
- Check export success, digest and archive integrity after each run. Monitor missing or stale backups and failed integrity checks. Record who can access the backup and restrict decryption to recovery operators.

## Drill and incident procedure

1. Record the time, deployment and affected environment. Freeze writes or disable the affected route when integrity is at risk. Keep logs and backups private and never include session tokens or backup payloads in tickets.
2. Restore into a new isolated branch. Validate expected row counts, constraints, workspace membership, sample backup reads and two-account isolation. Use separate object credentials and synthetic files to verify downloads. Record actual recovery point and time.
3. Confirm compatibility between the restored schema and the application build. Vercel Instant Rollback changes the serving deployment only. It does not revert a migration, external service state or credentials. Review the original deployment's environment compatibility before rolling back.
4. Authorize cutover separately, check health and account/backup smoke flows, then record follow-up fixes and rotate affected credentials.

The Local Agent test restores a pinned Git commit from disposable Git storage. The database test applies SQL to a disposable engine. Hosted backups, schedules, alerts, a PostgreSQL dump restore and Vercel rollback remain unverified. [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback)
