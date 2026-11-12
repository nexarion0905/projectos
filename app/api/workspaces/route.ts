import { currentUser, createWorkspace, listWorkspaces, isWorkspaceName, registerAccount } from '@/lib/server/workspace';
import { apiError, HttpError, json, readJson } from '@/lib/server/http';

export async function GET() {
  try {
    const user = await currentUser();
    await registerAccount(user.id);
    return json({ accountId: user.id, workspaces: await listWorkspaces(user.id) });
  } catch (error) {
    return apiError(error, 'workspaces.list');
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    const { name, kind = 'personal' } = await readJson(request);
    if (typeof name !== 'string' || !isWorkspaceName(name)) throw new HttpError(400, 'Workspace name is invalid.');
    if (kind !== 'personal' && kind !== 'team') throw new HttpError(400, 'Workspace kind is invalid.');
    await registerAccount(user.id);
    return json({ workspaceId: await createWorkspace(user.id, name.trim(), kind) }, 201);
  } catch (error) {
    return apiError(error, 'workspaces.create');
  }
}
