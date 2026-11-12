import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { z } from 'zod';
import type { ProjectManifest } from './manifest.js';

const entrySchema = z.object({ id: z.string().uuid(), name: z.string().min(1).max(160), root: z.string().min(1), manifest: z.unknown() });
const registrySchema = z.array(entrySchema).max(500);
export type RegistryEntry = z.infer<typeof entrySchema>;
export function registryPath() { return process.env.PROJECTOS_HOME ? path.join(process.env.PROJECTOS_HOME, 'registry.json') : path.join(os.homedir(), '.projectos', 'registry.json'); }
export async function readRegistry(): Promise<RegistryEntry[]> {
  try { return registrySchema.parse(JSON.parse(await readFile(registryPath(), 'utf8'))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw new Error('ProjectOS local registry is invalid. Back it up and repair it before continuing.'); }
}
export async function registerProject(root: string, manifest: ProjectManifest): Promise<void> {
  const entries = await readRegistry();
  const next = [...entries.filter((entry) => path.resolve(entry.root).toLowerCase() !== path.resolve(root).toLowerCase()), { id: manifest.id, name: manifest.name, root: path.resolve(root), manifest }];
  if (next.length > 500) throw new Error('Local registry is full (maximum 500 projects).');
  const target = registryPath(); await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(next, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}
