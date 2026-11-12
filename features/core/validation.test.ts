import { describe, expect, it } from 'vitest';
import { parseBackup } from './validation';
import type { WorkspaceData } from './types';

const workspace: WorkspaceData = {
  projects: [{ id: 'p1', name: 'Sample', description: '', category: 'Software', status: 'Active', priority: 'Medium', progress: 0, owner: 'Nexa Rion', tags: [], objectives: [], isDemo: false, createdAt: '2026-11-12T12:00:00.000Z', updatedAt: '2026-11-12T12:00:00.000Z' }],
  tasks: [], milestones: [], research: [], nodes: [{ id: 'n1', label: 'Sample', category: 'Project', recordId: 'p1', description: '', x: 50, y: 50, isDemo: false, createdAt: '2026-11-12T12:00:00.000Z', updatedAt: '2026-11-12T12:00:00.000Z' }],
  edges: [], events: [], settings: { id: 'preferences', displayName: 'Nexa Rion', theme: 'dark', reducedMotion: false, seeded: false, version: 1 },
};
const backup = (data = workspace) => ({ app: 'ProjectOS', schemaVersion: 1, exportedAt: '2026-11-12T12:00:00.000Z', data });

describe('ProjectOS backup validation', () => {
  it('accepts a well-formed schema v1 backup', () => expect(parseBackup(backup()).projects).toHaveLength(1));
  it('rejects duplicate project IDs', () => expect(() => parseBackup(backup({ ...workspace, projects: [...workspace.projects, workspace.projects[0]] }))).toThrow('Duplicate project identifier'));
  it('rejects task references to missing projects', () => expect(() => parseBackup(backup({ ...workspace, tasks: [{ id: 't1', projectId: 'missing', title: 'Task', description: '', status: 'To Do', priority: 'Low', labels: [], dependsOn: [], isDemo: false, createdAt: '2026-11-12T12:00:00.000Z', updatedAt: '2026-11-12T12:00:00.000Z' }] }))).toThrow('missing project'));
  it('rejects cyclic task dependencies', () => expect(() => parseBackup(backup({ ...workspace, tasks: [
    { id: 't1', projectId: 'p1', title: 'One', description: '', status: 'To Do', priority: 'Low', labels: [], dependsOn: ['t2'], isDemo: false, createdAt: '2026-11-12T12:00:00.000Z', updatedAt: '2026-11-12T12:00:00.000Z' },
    { id: 't2', projectId: 'p1', title: 'Two', description: '', status: 'To Do', priority: 'Low', labels: [], dependsOn: ['t1'], isDemo: false, createdAt: '2026-11-12T12:00:00.000Z', updatedAt: '2026-11-12T12:00:00.000Z' },
  ] }))).toThrow('cycle'));
});
