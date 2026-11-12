import { db } from './database';
import { nowIso, uid, type Milestone, type Project, type ResearchRecord, type Task } from './types';

const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export async function seedIfEmpty() {
  if (await db.projects.count()) return;
  const now = nowIso();
  const projects: Project[] = [
    { id: 'demo-projectos', name: 'ProjectOS', description: 'Project intelligence and operations for the Nexa Rion ecosystem.', category: 'Software', status: 'Active', priority: 'Critical', progress: 62, targetDate: daysFromNow(24), owner: 'Nexa Rion', tags: ['Platform', 'Ecosystem'], objectives: ['Coordinate project work', 'Connect research and evidence'], nextAction: 'Review the showcase release plan', isDemo: true, createdAt: now, updatedAt: now },
    { id: 'demo-aura', name: 'AURA', description: 'Planned personalized intelligence and interaction layer; this record describes a concept, not a completed system.', category: 'AI Systems', status: 'Research', priority: 'High', progress: 28, targetDate: daysFromNow(42), owner: 'Nexa Rion', tags: ['AI', 'Ecosystem'], objectives: ['Define the initial system boundaries', 'Map integration requirements'], nextAction: 'Clarify the first supported user workflows', isDemo: true, createdAt: now, updatedAt: now },
    { id: 'demo-codex', name: 'Nexa Codex', description: 'Structured knowledge and concept records for the wider ecosystem.', category: 'Knowledge', status: 'Validating', priority: 'High', progress: 46, targetDate: daysFromNow(60), owner: 'Nexa Rion', tags: ['Knowledge'], objectives: ['Establish record conventions', 'Track evidence scope'], nextAction: 'Review concept metadata', isDemo: true, createdAt: now, updatedAt: now },
    { id: 'demo-los', name: 'LOS', description: 'A broader personal life-management architecture, distinct from project operations.', category: 'Platform', status: 'Research', priority: 'Medium', progress: 21, targetDate: daysFromNow(90), owner: 'Nexa Rion', tags: ['Ecosystem', 'Concept'], objectives: ['Define system boundaries'], isDemo: true, createdAt: now, updatedAt: now },
    { id: 'demo-nexahq', name: 'Nexa AI HQ', description: 'Ecosystem coordination environment that may integrate with ProjectOS.', category: 'AI Systems', status: 'Paused', priority: 'Medium', progress: 14, targetDate: daysFromNow(75), owner: 'Nexa Rion', tags: ['Ecosystem'], objectives: ['Define integration contract'], isDemo: true, createdAt: now, updatedAt: now },
  ];
  const tasks: Task[] = [
    { id: uid(), projectId: projects[0].id, title: 'Review the showcase release plan', description: 'Confirm the scope for the local-first release.', status: 'In Progress', priority: 'High', dueDate: daysFromNow(2), labels: ['Planning'], dependsOn: [], isDemo: true, createdAt: now, updatedAt: now },
    { id: uid(), projectId: projects[0].id, title: 'Define project record fields', description: 'Align project, task, research, and graph records.', status: 'Review', priority: 'Medium', dueDate: daysFromNow(5), labels: ['Architecture'], dependsOn: [], isDemo: true, createdAt: now, updatedAt: now },
    { id: uid(), projectId: projects[1].id, title: 'Map AURA integration boundaries', description: 'Record open questions; do not assume the integration exists.', status: 'To Do', priority: 'High', dueDate: daysFromNow(8), labels: ['Research'], dependsOn: [], isDemo: true, createdAt: now, updatedAt: now },
    { id: uid(), projectId: projects[2].id, title: 'Review concept metadata', description: 'Check status and evidence-scope labels.', status: 'Blocked', priority: 'Medium', dueDate: daysFromNow(-1), labels: ['Knowledge'], dependsOn: [], isDemo: true, createdAt: now, updatedAt: now },
    { id: uid(), projectId: projects[3].id, title: 'Separate personal and project operations', description: 'Document the integration boundary.', status: 'Done', priority: 'Low', dueDate: daysFromNow(-2), labels: ['Architecture'], dependsOn: [], isDemo: true, createdAt: now, updatedAt: now },
  ];
  const milestones: Milestone[] = [
    { id: uid(), projectId: projects[0].id, title: 'Showcase scope review', description: 'Review the local-first release requirements.', dueDate: daysFromNow(6), completed: false, isDemo: true, createdAt: now, updatedAt: now },
    { id: uid(), projectId: projects[1].id, title: 'Initial AURA boundary notes', description: 'Document open questions for a future integration.', dueDate: daysFromNow(17), completed: false, isDemo: true, createdAt: now, updatedAt: now },
  ];
  const research: ResearchRecord[] = [
    { id: uid(), projectId: projects[1].id, title: 'AURA interaction boundary notes', question: 'Which workflows belong to the initial interaction layer?', summary: 'An initial scoping note for future design work.', category: 'System design', hypothesis: 'A narrow first integration may reduce coordination overhead.', methodology: 'Open question; no evaluation has been performed.', observations: 'No empirical observations recorded.', evidenceScope: 'Hypothesis', confidence: 20, status: 'In progress', sourceUrls: [], tags: ['AURA', 'Scope'], isDemo: true, createdAt: now, updatedAt: now },
    { id: uid(), projectId: projects[2].id, title: 'Evidence labeling conventions', question: 'How should records distinguish hypotheses from observations?', summary: 'A draft convention for keeping research claims scoped.', category: 'Research methods', hypothesis: 'Explicit labels can make evidence limits easier to inspect.', methodology: 'Design proposal only.', observations: 'Not validated with users.', evidenceScope: 'Speculation', confidence: 10, status: 'Draft', sourceUrls: [], tags: ['Evidence', 'Method'], isDemo: true, createdAt: now, updatedAt: now },
  ];
  const nodes = projects.map((p, i) => ({ id: `node-${p.id}`, label: p.name, category: p.category === 'AI Systems' ? 'AI System' : 'Project', recordId: p.id, description: p.description, x: [50, 28, 73, 23, 78][i], y: [48, 22, 24, 76, 73][i], isDemo: true, createdAt: now, updatedAt: now }));
  const edges = [
    { id: uid(), sourceId: nodes[0].id, targetId: nodes[1].id, relationship: 'Integrates with', description: 'Potential future integration; no live connection is configured.', isDemo: true, createdAt: now, updatedAt: now },
    { id: uid(), sourceId: nodes[0].id, targetId: nodes[2].id, relationship: 'Related to', description: 'Both belong to the Nexa Rion ecosystem.', isDemo: true, createdAt: now, updatedAt: now },
    { id: uid(), sourceId: nodes[0].id, targetId: nodes[3].id, relationship: 'Related to', description: 'Distinct system boundaries within the wider ecosystem.', isDemo: true, createdAt: now, updatedAt: now },
    { id: uid(), sourceId: nodes[0].id, targetId: nodes[4].id, relationship: 'Integrates with', description: 'Possible coordination interface; not implemented.', isDemo: true, createdAt: now, updatedAt: now },
  ];
  await db.transaction('rw', [db.projects, db.tasks, db.milestones, db.research, db.nodes, db.edges, db.settings], async () => {
    await db.projects.bulkAdd(projects);
    await db.tasks.bulkAdd(tasks);
    await db.milestones.bulkAdd(milestones);
    await db.research.bulkAdd(research);
    await db.nodes.bulkAdd(nodes);
    await db.edges.bulkAdd(edges);
    await db.settings.put({ id: 'preferences', displayName: 'Nexa Rion', theme: 'dark', reducedMotion: false, seeded: true, version: 1 });
  });
}
