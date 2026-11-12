import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { inspectProject } from './manifest.js';
import { registerProject, readRegistry } from './registry.js';
import { restoreManifest } from './restore.js';

function option(args: string[], key: string) { const i = args.indexOf(key); return i >= 0 ? args[i + 1] : undefined; }
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help') {
    console.log('ProjectOS Local Agent\n  inspect <folder> [--name <name>] [--output <file>]\n  register <folder> [--name <name>] [--output <file>]\n  status\n  restore <manifest.json> --destination <new-folder>\n  doctor'); return;
  }
  if (command === 'inspect' || command === 'register') {
    const folder = args.find((arg) => !arg.startsWith('--'));
    if (!folder) throw new Error(`${command} requires a project folder.`);
    const manifest = await inspectProject(folder, option(args, '--name'));
    if (command === 'register') { await registerProject(folder, manifest); console.log(`Registered ${manifest.name}.`); }
    const output = option(args, '--output');
    if (output) { const target = path.resolve(output); await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', encoding: 'utf8' }); console.log(`Manifest written to ${target}`); }
    else console.log(JSON.stringify(manifest, null, 2));
    return;
  }
  if (command === 'status') { const projects = await readRegistry(); console.log(JSON.stringify(projects.map(({ id, name, root }) => ({ id, name, root })), null, 2)); return; }
  if (command === 'restore') {
    const source = args.find((arg) => !arg.startsWith('--'));
    const destination = option(args, '--destination');
    if (!source || !destination) throw new Error('restore requires a manifest file and --destination <new-folder>.');
    const result = await restoreManifest(JSON.parse(await readFile(source, 'utf8')), destination);
    console.log(JSON.stringify(result, null, 2)); return;
  }
  if (command === 'doctor') { const projects = await readRegistry(); console.log(JSON.stringify({ node: process.version, git: await import('node:child_process').then(({ execFileSync }) => { try { return execFileSync('git', ['--version'], { encoding: 'utf8', windowsHide: true }).trim(); } catch { return 'missing'; } }), registeredProjects: projects.length, registry: 'readable' }, null, 2)); return; }
  throw new Error(`Unknown command: ${command}`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Local Agent failed.'); process.exitCode = 1; });
