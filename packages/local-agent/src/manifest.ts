import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { lstat, realpath, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const execFileAsync = promisify(execFile);
export const manifestSchema = z.object({
  app: z.literal('ProjectOS'), schemaVersion: z.literal(1), id: z.string().uuid(), name: z.string().min(1).max(160),
  createdAt: z.string().datetime(), repository: z.object({ provider: z.literal('git'), url: z.string().max(2048).optional(), branch: z.string().max(255).optional(), commit: z.string().regex(/^[a-f0-9]{7,64}$/i).optional() }).optional(),
  runtime: z.object({ node: z.string().max(120).optional(), packageManager: z.enum(['npm','pnpm','yarn','bun']).optional(), manifestFiles: z.array(z.string().max(240)).max(20) }),
  requiredEnvironment: z.array(z.string().regex(/^[A-Z_][A-Z0-9_]*$/).max(128)).max(300),
  layout: z.array(z.string().max(240)).max(300),
  restorePolicy: z.literal('new-directory-only'),
});
export type ProjectManifest = z.infer<typeof manifestSchema>;

const ignored = new Set(['.git', '.next', 'node_modules', 'dist', 'build', 'coverage', '.turbo', '.vercel', '.projectos']);
const sensitiveName = /(^|\/)(\.env($|\.)|.*\.(pem|key|p12|pfx|jks|keystore)$|id_rsa|id_ed25519|credentials|secrets?)(\/|$)/i;

export function sanitizeRepositoryUrl(raw: string): string | undefined {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) {
    try { const url = new URL(value); url.username = ''; url.password = ''; url.search = ''; url.hash = ''; return url.toString(); } catch { return undefined; }
  }
  if (/^ssh:\/\//i.test(value)) {
    try { const url = new URL(value); url.password = ''; url.search = ''; url.hash = ''; return url.toString(); } catch { return undefined; }
  }
  if (/^[^\s@]+@[^\s:]+:.+/.test(value)) return value;
  return undefined;
}

async function git(root: string, ...args: string[]) {
  try { const { stdout } = await execFileAsync('git', ['-C', root, ...args], { timeout: 5000, windowsHide: true, maxBuffer: 32_000 }); return stdout.trim(); }
  catch { return ''; }
}

async function readEnvNames(root: string): Promise<string[]> {
  const names = new Set<string>();
  for (const filename of ['.env.example', '.env.sample', '.env.template']) {
    try {
      const text = await readFile(path.join(root, filename), 'utf8');
      for (const line of text.split(/\r?\n/)) { const match = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=/.exec(line); if (match) names.add(match[1]); }
    } catch { /* no template */ }
  }
  return [...names].sort();
}

function ignoredByGit(relative: string, name: string, rules: string[]) {
  for (const raw of rules) {
    const pattern = raw.trim();
    if (!pattern || pattern.startsWith('#') || pattern.startsWith('!')) continue;
    const dirOnly = pattern.endsWith('/');
    const body = pattern.replace(/^\//, '').replace(/\/$/, '');
    const escaped = body.split('').map((char) => char === '*' ? '.*' : char === '?' ? '.' : /[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char).join('');
    const matcher = new RegExp(pattern.includes('/') ? `^${escaped}(?:/.*)?$` : `(?:^|/)${escaped}(?:/.*)?$`);
    if (matcher.test(relative) && (!dirOnly || name === body || relative.split('/').includes(body))) return true;
  }
  return false;
}

async function walk(root: string, current = root, result: string[] = [], inheritedRules: string[] = []): Promise<string[]> {
  if (result.length >= 300) return result;
  let rules = inheritedRules;
  try { rules = [...inheritedRules, ...(await readFile(path.join(current, '.gitignore'), 'utf8')).split(/\r?\n/)]; } catch { /* no local ignore file */ }
  let entries;
  try { entries = await readdir(current, { withFileTypes: true }); } catch { return result; }
  for (const entry of entries) {
    if (entry.isSymbolicLink() || ignored.has(entry.name) || entry.name === '.env' || entry.name.startsWith('.env.')) continue;
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    if (sensitiveName.test(relative) || ignoredByGit(relative, entry.name, rules)) continue;
    if (entry.isDirectory()) await walk(root, absolute, result, rules);
    else if (entry.isFile()) result.push(relative);
    if (result.length >= 300) break;
  }
  return result;
}

export async function inspectProject(folder: string, name?: string): Promise<ProjectManifest> {
  const requestedRoot = path.resolve(folder);
  const requestedInfo = await lstat(requestedRoot);
  if (!requestedInfo.isDirectory() || requestedInfo.isSymbolicLink()) throw new Error('Project root must be a real directory, not a symbolic link.');
  const root = await realpath(requestedRoot);
  const [originRaw, branch, commit, files] = await Promise.all([
    git(root, 'remote', 'get-url', 'origin'), git(root, 'branch', '--show-current'), git(root, 'rev-parse', 'HEAD'), walk(root),
  ]);
  const origin = originRaw ? sanitizeRepositoryUrl(originRaw) : undefined;
  const manifestFiles = ['package.json','pnpm-lock.yaml','yarn.lock','bun.lockb','bun.lock','requirements.txt','pyproject.toml','Cargo.toml','go.mod'].filter((file) => files.includes(file));
  const packageManager = files.includes('pnpm-lock.yaml') ? 'pnpm' : files.includes('yarn.lock') ? 'yarn' : (files.includes('bun.lockb') || files.includes('bun.lock')) ? 'bun' : files.includes('package-lock.json') ? 'npm' : undefined;
  return manifestSchema.parse({
    app: 'ProjectOS', schemaVersion: 1, id: crypto.randomUUID(), name: (name || path.basename(root)).slice(0, 160), createdAt: new Date().toISOString(),
    repository: origin ? { provider: 'git', url: origin, ...(branch ? { branch } : {}), ...(commit ? { commit } : {}) } : undefined,
    runtime: { ...(packageManager ? { node: process.version, packageManager } : {}), manifestFiles },
    requiredEnvironment: await readEnvNames(root), layout: files.sort(), restorePolicy: 'new-directory-only',
  });
}

export function parseManifest(input: unknown): ProjectManifest { return manifestSchema.parse(input); }

export async function resolveSafeFile(root: string, relative: string): Promise<string> {
  if (!relative || path.isAbsolute(relative) || relative.includes('\0')) throw new Error('Path must be relative to the registered project root.');
  const rootReal = await realpath(root);
  const target = path.resolve(rootReal, relative);
  if (target === rootReal || !target.startsWith(rootReal + path.sep)) throw new Error('Path escapes the registered project root.');
  const segments = path.relative(rootReal, target).split(path.sep);
  if (segments.some((segment) => segment === '..') || sensitiveName.test(segments.join('/'))) throw new Error('Access to this path is not allowed.');
  let cursor = rootReal;
  for (const segment of segments) {
    cursor = path.join(cursor, segment);
    try { const stat = await lstat(cursor); if (stat.isSymbolicLink()) throw new Error('Symbolic links are not read through the local agent.'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') break; throw error; }
  }
  return target;
}
