import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { parseManifest, sanitizeRepositoryUrl } from './manifest.js';
const execFileAsync = promisify(execFile);

export async function restoreManifest(input: unknown, destinationArg: string) {
  const manifest = parseManifest(input);
  if (!manifest.repository?.url) throw new Error('This manifest has no Git remote to restore.');
  if (!manifest.repository.commit || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(manifest.repository.commit)) throw new Error('Restore requires a full pinned commit hash in the manifest.');
  const remote = sanitizeRepositoryUrl(manifest.repository.url);
  if (!remote || !/^(https:\/\/|ssh:\/\/|[^\s@]+@[^\s:]+:)/i.test(remote)) throw new Error('Restore accepts HTTPS or SSH Git remotes only.');
  const destination = path.resolve(destinationArg);
  const parsed = path.parse(destination);
  if (destination === parsed.root || !parsed.base || parsed.base === '.' || parsed.base === '..') throw new Error('Choose a new project directory below a parent folder.');
  try { await mkdir(destination); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Restore stopped: destination already exists. Choose a new directory; existing files are never overwritten.');
    throw error;
  }
  const hooks = path.join(destination, '.git', 'projectos-disabled-hooks');
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  try {
    await execFileAsync('git', ['-c', `core.hooksPath=${hooks}`, 'clone', '--no-checkout', '--', remote, destination], { env, timeout: 120_000, windowsHide: true, maxBuffer: 2_000_000 });
    await execFileAsync('git', ['-C', destination, '-c', `core.hooksPath=${hooks}`, 'checkout', '--detach', manifest.repository.commit], { env, timeout: 30_000, windowsHide: true, maxBuffer: 100_000 });
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'Git is not installed or is unavailable.' : 'Git could not clone the repository or check out the pinned commit.';
    throw new Error(`${reason} The new directory was preserved for review.`);
  }
  const { stdout } = await execFileAsync('git', ['-C', destination, 'rev-parse', 'HEAD'], { timeout: 5000, windowsHide: true });
  const commit = stdout.trim();
  const verified = /^[a-f0-9]{40,64}$/i.test(commit) && commit.toLowerCase() === manifest.repository.commit.toLowerCase();
  if (!verified) throw new Error('Restore completed, but the checked out commit did not match the manifest. The new directory was preserved for review.');
  return { destination, commit, verified, branch: manifest.repository.branch || undefined };
}
