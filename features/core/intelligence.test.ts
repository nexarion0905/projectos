import { describe, expect, it } from 'vitest';
import { answerCommand, isOverdue, portfolioMetrics, projectProgress, searchWorkspace, wouldCreateDependencyCycle } from './intelligence';
import type { WorkspaceData } from './types';

const data: WorkspaceData = {
  projects: [{ id: 'p1', name: 'AURA', description: 'Concept', category: 'AI', status: 'Research', priority: 'High', progress: 25, owner: 'Nexa Rion', tags: [], objectives: [], isDemo: true, createdAt: '', updatedAt: '' }],
  tasks: [{ id: 't1', projectId: 'p1', title: 'Review scope', description: '', status: 'Blocked', priority: 'High', dueDate: '2026-11-10', labels: [], dependsOn: [], isDemo: true, createdAt: '', updatedAt: '' }],
  milestones: [], research: [], nodes: [], edges: [], events: [], settings: { id: 'preferences', displayName: 'Test', theme: 'dark', reducedMotion: false, seeded: true, version: 1 },
};

describe('local workspace intelligence', () => {
  it('calculates overdue work from stored due dates and status', () => {
    expect(isOverdue(data.tasks[0], new Date('2026-11-12T12:00:00'))).toBe(true);
    expect(portfolioMetrics(data, new Date('2026-11-12T12:00:00')).overdue).toBe(1);
  });
  it('does not mark a completed task overdue', () => {
    expect(isOverdue({ ...data.tasks[0], status: 'Done' }, new Date('2026-11-12T12:00:00'))).toBe(false);
  });
  it('searches project and task records', () => {
    expect(searchWorkspace('review', data).map((x) => x.type)).toContain('Task');
    expect(searchWorkspace('aura', data).map((x) => x.type)).toContain('Project');
  });
  it('answers from actual blocked records', () => {
    expect(answerCommand('show blocked tasks', data)).toContain('Review scope');
  });
  it('calculates project progress only from completed tasks', () => {
    expect(projectProgress('p1', data.tasks)).toBe(0);
    expect(projectProgress('p1', [{ ...data.tasks[0], status: 'Done' }])).toBe(100);
    expect(projectProgress('missing', data.tasks)).toBe(0);
  });
  it('rejects task dependency cycles', () => {
    const chain = [{ ...data.tasks[0], id: 'a', dependsOn: [] }, { ...data.tasks[0], id: 'b', dependsOn: ['a'] }];
    expect(wouldCreateDependencyCycle(chain, 'a', ['b'])).toBe(true);
    expect(wouldCreateDependencyCycle(chain, 'a', ['missing'])).toBe(false);
  });
});
