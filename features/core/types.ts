export type ProjectStatus = 'Active' | 'Research' | 'Validating' | 'Paused' | 'Completed' | 'Archived';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Backlog' | 'To Do' | 'In Progress' | 'Blocked' | 'Review' | 'Done';
export type EvidenceScope = 'Speculation' | 'Hypothesis' | 'Simulation' | 'Experiment' | 'Observation' | 'Independently validated';

export interface Project {
  id: string; name: string; description: string; category: string; status: ProjectStatus;
  priority: Priority; progress: number; targetDate?: string; owner: string; tags: string[];
  objectives: string[]; nextAction?: string; isDemo: boolean; createdAt: string; updatedAt: string;
}
export interface Task {
  id: string; projectId: string; title: string; description: string; status: TaskStatus;
  priority: Priority; dueDate?: string; labels: string[]; dependsOn: string[]; isDemo: boolean;
  createdAt: string; updatedAt: string;
}
export interface Milestone {
  id: string; projectId: string; title: string; description: string; dueDate: string;
  completed: boolean; isDemo: boolean; createdAt: string; updatedAt: string;
}
export interface ResearchRecord {
  id: string; projectId?: string; title: string; question: string; summary: string;
  category: string; hypothesis: string; methodology: string; observations: string;
  evidenceScope: EvidenceScope; confidence: number; status: 'Draft' | 'In progress' | 'Reviewed';
  sourceUrls: string[]; tags: string[]; isDemo: boolean; createdAt: string; updatedAt: string;
}
export interface GraphNode {
  id: string; label: string; category: string; recordId?: string; description: string;
  x: number; y: number; isDemo: boolean; createdAt: string; updatedAt: string;
}
export interface GraphEdge {
  id: string; sourceId: string; targetId: string; relationship: string; description: string;
  isDemo: boolean; createdAt: string; updatedAt: string;
}
export interface AuditEvent {
  id: string; action: string; targetType: string; targetId: string; summary: string; timestamp: string;
}
export interface AppSettings {
  id: 'preferences'; displayName: string; theme: 'dark' | 'light'; reducedMotion: boolean;
  seeded: boolean; version: number;
}
export interface WorkspaceData {
  projects: Project[]; tasks: Task[]; milestones: Milestone[]; research: ResearchRecord[];
  nodes: GraphNode[]; edges: GraphEdge[]; events: AuditEvent[]; settings: AppSettings;
}
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const nowIso = () => new Date().toISOString();
