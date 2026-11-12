import type { Project, Task, WorkspaceData } from './types';

export function isOverdue(task: Task, now = new Date()) {
  return Boolean(task.dueDate && task.status !== 'Done' && new Date(`${task.dueDate}T23:59:59`) < now);
}

export function projectProgress(projectId: string, tasks: Task[]) {
  const related = tasks.filter((task) => task.projectId === projectId);
  return related.length ? Math.round((related.filter((task) => task.status === 'Done').length / related.length) * 100) : 0;
}

export function wouldCreateDependencyCycle(tasks: Task[], taskId: string, dependencies: string[]) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const pathExists = (current: string, target: string, visited = new Set<string>()): boolean => {
    if (current === target) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    return (byId.get(current)?.dependsOn ?? []).some((dependency) => pathExists(dependency, target, visited));
  };
  return dependencies.some((dependency) => dependency === taskId || pathExists(dependency, taskId));
}

export function portfolioMetrics(data: Pick<WorkspaceData, 'projects' | 'tasks' | 'milestones' | 'research'>, now = new Date()) {
  const visibleProjects = data.projects.filter((p) => p.status !== 'Archived');
  return {
    total: visibleProjects.length,
    active: visibleProjects.filter((p) => p.status === 'Active').length,
    research: visibleProjects.filter((p) => p.status === 'Research').length,
    validation: visibleProjects.filter((p) => p.status === 'Validating').length,
    completed: visibleProjects.filter((p) => p.status === 'Completed').length,
    paused: visibleProjects.filter((p) => p.status === 'Paused').length,
    overdue: data.tasks.filter((t) => isOverdue(t, now)).length,
    upcomingMilestones: data.milestones.filter((m) => !m.completed && new Date(`${m.dueDate}T00:00:00`) >= now).length,
    doneTasks: data.tasks.filter((t) => t.status === 'Done').length,
    totalTasks: data.tasks.length,
    researchCount: data.research.length,
    averageProgress: visibleProjects.length ? Math.round(visibleProjects.reduce((n, p) => n + projectProgress(p.id, data.tasks), 0) / visibleProjects.length) : 0,
  };
}

export function searchWorkspace(query: string, data: Pick<WorkspaceData, 'projects' | 'tasks' | 'milestones' | 'research' | 'nodes'>) {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  return [
    ...data.projects.filter((x) => `${x.name} ${x.description} ${x.tags.join(' ')}`.toLocaleLowerCase().includes(q)).map((x) => ({ type: 'Project', id: x.id, title: x.name, detail: x.description })),
    ...data.tasks.filter((x) => `${x.title} ${x.description} ${x.labels.join(' ')}`.toLocaleLowerCase().includes(q)).map((x) => ({ type: 'Task', id: x.id, title: x.title, detail: x.status })),
    ...data.milestones.filter((x) => `${x.title} ${x.description}`.toLocaleLowerCase().includes(q)).map((x) => ({ type: 'Milestone', id: x.id, title: x.title, detail: x.dueDate })),
    ...data.research.filter((x) => `${x.title} ${x.question} ${x.summary} ${x.tags.join(' ')}`.toLocaleLowerCase().includes(q)).map((x) => ({ type: 'Research', id: x.id, title: x.title, detail: `${x.evidenceScope} · ${x.status}` })),
    ...data.nodes.filter((x) => `${x.label} ${x.category}`.toLocaleLowerCase().includes(q)).map((x) => ({ type: 'Knowledge node', id: x.id, title: x.label, detail: x.category })),
  ];
}

export function projectSummary(project: Project, tasks: Task[]) {
  const related = tasks.filter((t) => t.projectId === project.id);
  const done = related.filter((t) => t.status === 'Done').length;
  const overdue = related.filter((t) => isOverdue(t)).length;
  const blocked = related.filter((t) => t.status === 'Blocked').length;
  const open = related.length - done;
  const next = related.filter((t) => t.status !== 'Done').sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))[0];
  return `${project.name} is ${project.status.toLowerCase()} at ${project.progress}% progress. ${done} of ${related.length} tasks are complete; ${open} remain open${blocked ? `, with ${blocked} blocked` : ''}${overdue ? ` and ${overdue} overdue` : ''}.${next ? ` Next up: ${next.title}${next.dueDate ? ` (due ${next.dueDate})` : ''}.` : ' No open tasks remain.'} ${project.description}`;
}

export function answerCommand(prompt: string, data: WorkspaceData) {
  const text = prompt.toLocaleLowerCase();
  if (/overdue|late|past due/.test(text)) {
    const overdue = data.tasks.filter((t) => isOverdue(t));
    return overdue.length ? `There ${overdue.length === 1 ? 'is' : 'are'} ${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}: ${overdue.map((t) => `${t.title} (${t.dueDate})`).join('; ')}.` : 'There are no overdue tasks in the current workspace.';
  }
  if (/blocked|blocker/.test(text)) {
    const blocked = data.tasks.filter((t) => t.status === 'Blocked');
    return blocked.length ? `${blocked.length} blocked task${blocked.length === 1 ? '' : 's'} need attention: ${blocked.map((t) => `${t.title} — ${data.projects.find((p) => p.id === t.projectId)?.name ?? 'Unassigned'}`).join('; ')}.` : 'No tasks are currently marked Blocked.';
  }
  if (/summar|status|report|overview/.test(text)) {
    const m = portfolioMetrics(data);
    return `Workspace status: ${m.total} projects, ${m.active} active, ${m.research} in research, ${m.validation} validating, and ${m.paused} paused. Task completion is ${m.doneTasks}/${m.totalTasks}; ${m.overdue} overdue. There are ${m.researchCount} research records. This summary is calculated from local workspace records.`;
  }
  if (/priorit|next|focus/.test(text)) {
    const candidates = data.tasks.filter((t) => t.status !== 'Done').sort((a, b) => {
      const rank: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (isOverdue(a) ? -4 : rank[a.priority]) - (isOverdue(b) ? -4 : rank[b.priority]) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    }).slice(0, 3);
    return candidates.length ? `Suggested focus based on priority and due date: ${candidates.map((t, i) => `${i + 1}. ${t.title} (${t.priority}${isOverdue(t) ? ', overdue' : ''})`).join('; ')}. This is a transparent local rule, not an AI-generated recommendation.` : 'There are no open tasks to prioritize.';
  }
  return 'I can summarize the workspace, find overdue or blocked tasks, or suggest a focus order from task priority and due dates. These responses use transparent local rules; no AI service is connected.';
}
