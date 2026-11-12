import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspectProject, parseManifest, resolveSafeFile, sanitizeRepositoryUrl } from './manifest.js';
import { restoreManifest } from './restore.js';

const tempRoots: string[] = [];
async function temp() { const folder = await mkdtemp(path.join(os.tmpdir(), 'projectos-agent-')); tempRoots.push(folder); return folder; }
afterEach(async () => { await Promise.all(tempRoots.splice(0).map((folder) => rm(folder, { recursive: true, force: true }))); });

describe('ProjectOS Local Agent safety', () => {
  it('creates a portable manifest with secret values excluded and only environment names included', async () => {
    const root = await temp();
    await writeFile(path.join(root, 'package.json'), '{"name":"demo"}');
    await writeFile(path.join(root, '.env'), 'DATABASE_URL=do-not-copy');
    await writeFile(path.join(root, '.env.example'), 'DATABASE_URL=\nOPENAI_API_KEY=\n');
    await writeFile(path.join(root, 'private.pem'), 'private key bytes');
    await mkdir(path.join(root, 'node_modules')); await writeFile(path.join(root, 'node_modules', 'not-a-project-file'), 'ignored');
    await writeFile(path.join(root, '.gitignore'), 'ignored-dir/\n'); await mkdir(path.join(root, 'ignored-dir')); await writeFile(path.join(root, 'ignored-dir', 'skip.txt'), 'skip');
    const manifest = await inspectProject(root, 'Fixture');
    expect(manifest.name).toBe('Fixture');
    expect(manifest.requiredEnvironment).toEqual(['DATABASE_URL', 'OPENAI_API_KEY']);
    expect(manifest.layout).toContain('package.json');
    expect(manifest.layout.join(' ')).not.toMatch(/\.env|private\.pem|node_modules|ignored-dir/);
    expect(JSON.stringify(manifest)).not.toContain('do-not-copy');
    expect(parseManifest(manifest).schemaVersion).toBe(1);
  });

  it('sanitizes credential-bearing remotes and rejects unsupported local remotes', () => {
    expect(sanitizeRepositoryUrl('https://user:token@example.com/org/repo.git?token=secret')).toBe('https://example.com/org/repo.git');
    expect(sanitizeRepositoryUrl('file:///tmp/repo.git')).toBeUndefined();
    expect(sanitizeRepositoryUrl('git://example.com/org/repo.git')).toBeUndefined();
    expect(sanitizeRepositoryUrl('C:\\repo')).toBeUndefined();
  });

  it('rejects traversal and symbolic links when reading project files', async () => {
    const root = await temp(); const outside = await temp();
    await writeFile(path.join(outside, 'secret.txt'), 'secret');
    await symlink(outside, path.join(root, 'linked'), 'junction');
    await expect(resolveSafeFile(root, '..\\secret.txt')).rejects.toThrow(/escapes|relative/);
    await expect(resolveSafeFile(root, 'linked/secret.txt')).rejects.toThrow(/Symbolic links/);
    await expect(resolveSafeFile(root, '.env')).rejects.toThrow(/not allowed/);
  });

  it('refuses to restore into an existing directory without changing its contents', async () => {
    const parent = await temp(); const destination = path.join(parent, 'existing'); await mkdir(destination);
    const sentinel = path.join(destination, 'keep.txt'); await writeFile(sentinel, 'preserve');
    const manifest = { app: 'ProjectOS', schemaVersion: 1, id: crypto.randomUUID(), name: 'Example', createdAt: new Date().toISOString(), repository: { provider: 'git', url: 'https://example.com/repo.git', commit: 'a'.repeat(40) }, runtime: { manifestFiles: [] }, requiredEnvironment: [], layout: [], restorePolicy: 'new-directory-only' };
    await expect(restoreManifest(manifest, destination)).rejects.toThrow(/already exists/);
    await expect(readFile(sentinel, 'utf8')).resolves.toBe('preserve');
  });

  it('requires a full pinned commit before restoring', async () => {
    const parent = await temp();
    const manifest = { app: 'ProjectOS', schemaVersion: 1, id: crypto.randomUUID(), name: 'Example', createdAt: new Date().toISOString(), repository: { provider: 'git', url: 'https://example.com/repo.git' }, runtime: { manifestFiles: [] }, requiredEnvironment: [], layout: [], restorePolicy: 'new-directory-only' };
    await expect(restoreManifest(manifest, path.join(parent, 'new-project'))).rejects.toThrow(/full pinned commit hash/);
  });

  it('rejects unauthenticated git protocol for restore', async () => {
    const parent = await temp();
    const manifest = { app: 'ProjectOS', schemaVersion: 1, id: crypto.randomUUID(), name: 'Example', createdAt: new Date().toISOString(), repository: { provider: 'git', url: 'git://example.com/repo.git', commit: 'a'.repeat(40) }, runtime: { manifestFiles: [] }, requiredEnvironment: [], layout: [], restorePolicy: 'new-directory-only' };
    await expect(restoreManifest(manifest, path.join(parent, 'new-project'))).rejects.toThrow(/HTTPS or SSH/);
  });
});
