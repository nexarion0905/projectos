import { z } from 'zod';
import type { WorkspaceData } from './types';

const id = z.string().min(1).max(180);
const iso = z.string().min(10).max(40);
const boundedText = (max = 3000) => z.string().max(max);
const projectSchema = z.object({
  id, name: z.string().trim().min(1).max(160), description: boundedText(3000), category: z.string().min(1).max(80),
  status: z.enum(['Active','Research','Validating','Paused','Completed','Archived']), priority: z.enum(['Low','Medium','High','Critical']),
  progress: z.number().int().min(0).max(100), targetDate: z.string().optional(), owner: z.string().max(160), tags: z.array(z.string().max(80)).max(80),
  objectives: z.array(z.string().max(1000)).max(100), nextAction: z.string().max(1000).optional(), isDemo: z.boolean(), createdAt: iso, updatedAt: iso,
});
const taskSchema = z.object({
  id, projectId: id, title: z.string().trim().min(1).max(240), description: boundedText(), status: z.enum(['Backlog','To Do','In Progress','Blocked','Review','Done']),
  priority: z.enum(['Low','Medium','High','Critical']), dueDate: z.string().optional(), labels: z.array(z.string().max(80)).max(80), dependsOn: z.array(id).max(100),
  isDemo: z.boolean(), createdAt: iso, updatedAt: iso,
});
const milestoneSchema = z.object({ id, projectId: id, title: z.string().trim().min(1).max(240), description: boundedText(2000), dueDate: z.string().min(10).max(10), completed: z.boolean(), isDemo: z.boolean(), createdAt: iso, updatedAt: iso });
const researchSchema = z.object({
  id, projectId: id.optional(), title: z.string().trim().min(1).max(240), question: boundedText(1000), summary: boundedText(3000), category: z.string().max(120),
  hypothesis: boundedText(3000), methodology: boundedText(3000), observations: boundedText(3000),
  evidenceScope: z.enum(['Speculation','Hypothesis','Simulation','Experiment','Observation','Independently validated']), confidence: z.number().int().min(0).max(100),
  status: z.enum(['Draft','In progress','Reviewed']), sourceUrls: z.array(z.string().url().max(2048)).max(100), tags: z.array(z.string().max(80)).max(80), isDemo: z.boolean(), createdAt: iso, updatedAt: iso,
});
const nodeSchema = z.object({ id, label: z.string().min(1).max(180), category: z.string().max(80), recordId: id.optional(), description: boundedText(2000), x: z.number().min(0).max(100), y: z.number().min(0).max(100), isDemo: z.boolean(), createdAt: iso, updatedAt: iso });
const edgeSchema = z.object({ id, sourceId: id, targetId: id, relationship: z.string().min(1).max(80), description: boundedText(2000), isDemo: z.boolean(), createdAt: iso, updatedAt: iso });
const eventSchema = z.object({ id, action: z.string().min(1).max(100), targetType: z.string().min(1).max(100), targetId: id, summary: boundedText(1000), timestamp: iso });
const settingsSchema = z.object({ id: z.literal('preferences'), displayName: z.string().min(1).max(120), theme: z.enum(['dark','light']), reducedMotion: z.boolean(), seeded: z.boolean(), version: z.number().int().min(1) });
const dataSchema = z.object({
  projects: z.array(projectSchema).max(10000), tasks: z.array(taskSchema).max(50000), milestones: z.array(milestoneSchema).max(20000),
  research: z.array(researchSchema).max(20000), nodes: z.array(nodeSchema).max(50000), edges: z.array(edgeSchema).max(100000),
  events: z.array(eventSchema).max(50000).optional(), settings: settingsSchema.optional(),
});

export const backupSchema = z.object({ app: z.literal('ProjectOS'), schemaVersion: z.literal(1), exportedAt: iso, data: dataSchema });

export function parseBackup(input: unknown): WorkspaceData {
  const result = backupSchema.safeParse(input);
  if (!result.success) throw new Error(`Invalid backup: ${result.error.issues.slice(0, 3).map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  const { data } = result.data;
  const unique = (items: { id: string }[], label: string) => {
    const ids = new Set<string>();
    for (const item of items) { if (ids.has(item.id)) throw new Error(`Duplicate ${label} identifier: ${item.id}`); ids.add(item.id); }
    return ids;
  };
  const projectIds = unique(data.projects, 'project');
  const taskIds = unique(data.tasks, 'task');
  const nodeIds = unique(data.nodes, 'graph node');
  unique(data.milestones, 'milestone'); unique(data.research, 'research'); unique(data.edges, 'graph edge');
  for (const task of data.tasks) {
    if (!projectIds.has(task.projectId)) throw new Error(`Task ${task.title} refers to a missing project`);
    if (task.dependsOn.some((dependency) => !taskIds.has(dependency) || dependency === task.id)) throw new Error(`Task ${task.title} has an invalid dependency`);
  }
  const tasksById = new Map(data.tasks.map((task) => [task.id, task]));
  const active = new Set<string>();
  const visited = new Set<string>();
  const visit = (taskId: string): boolean => {
    if (active.has(taskId)) return true;
    if (visited.has(taskId)) return false;
    active.add(taskId);
    const hasCycle = (tasksById.get(taskId)?.dependsOn ?? []).some(visit);
    active.delete(taskId);
    visited.add(taskId);
    return hasCycle;
  };
  if (data.tasks.some((task) => visit(task.id))) throw new Error('Task dependencies contain a cycle');
  for (const item of data.milestones) if (!projectIds.has(item.projectId)) throw new Error(`Milestone ${item.title} refers to a missing project`);
  for (const item of data.research) if (item.projectId && !projectIds.has(item.projectId)) throw new Error(`Research record ${item.title} refers to a missing project`);
  for (const edge of data.edges) if (!nodeIds.has(edge.sourceId) || !nodeIds.has(edge.targetId) || edge.sourceId === edge.targetId) throw new Error(`Graph relationship ${edge.id} has an invalid endpoint`);
  return { projects: data.projects, tasks: data.tasks, milestones: data.milestones, research: data.research, nodes: data.nodes, edges: data.edges, events: data.events ?? [], settings: data.settings ?? { id: 'preferences', displayName: 'Nexa Rion', theme: 'dark', reducedMotion: false, seeded: false, version: 1 } };
}
