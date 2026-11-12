import Dexie, { type Table } from 'dexie';
import type { AppSettings, AuditEvent, GraphEdge, GraphNode, Milestone, Project, ResearchRecord, Task } from './types';

class ProjectOSDatabase extends Dexie {
  projects!: Table<Project, string>;
  tasks!: Table<Task, string>;
  milestones!: Table<Milestone, string>;
  research!: Table<ResearchRecord, string>;
  nodes!: Table<GraphNode, string>;
  edges!: Table<GraphEdge, string>;
  events!: Table<AuditEvent, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('projectos-local');
    this.version(1).stores({
      projects: 'id, name, status, priority, category, updatedAt',
      tasks: 'id, projectId, status, priority, dueDate, updatedAt, [projectId+status]',
      milestones: 'id, projectId, dueDate, completed',
      research: 'id, projectId, title, category, status, evidenceScope, updatedAt',
      nodes: 'id, label, category, recordId',
      edges: 'id, sourceId, targetId, relationship',
      events: 'id, timestamp, targetType, targetId',
      settings: 'id',
    });
    // Future schema upgrades belong in later version(n).upgrade(...) blocks.
  }
}

export const db = new ProjectOSDatabase();
