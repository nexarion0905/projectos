import { addMember, currentUser, isUserId, isUuid, listMembers, memberRoles, removeMember } from '@/lib/server/workspace';
import { apiError, HttpError, json, readJson } from '@/lib/server/http';

type Context = { params: Promise<{ workspaceId: string }> };

async function workspace(context: Context) {
  const user = await currentUser();
  const { workspaceId } = await context.params;
  if (!isUuid(workspaceId)) throw new HttpError(400, 'Invalid workspace ID.');
  return { user, workspaceId };
}

export async function GET(_request: Request, context: Context) {
  try {
    const { user, workspaceId } = await workspace(context);
    return json({ members: await listMembers(user.id, workspaceId) });
  } catch (error) {
    return apiError(error, 'members.list');
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { user, workspaceId } = await workspace(context);
    const body = await readJson(request);
    const role = memberRoles.find((value) => value === body.role);
    if (typeof body.userId !== 'string' || !isUserId(body.userId) || !role) throw new HttpError(400, 'Invalid member input.');
    await addMember(user.id, workspaceId, body.userId, role);
    return json({ ok: true }, 201);
  } catch (error) {
    return apiError(error, 'members.add');
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { user, workspaceId } = await workspace(context);
    const { userId } = await readJson(request);
    if (typeof userId !== 'string' || !isUserId(userId)) throw new HttpError(400, 'Invalid member input.');
    await removeMember(user.id, workspaceId, userId);
    return json({ ok: true });
  } catch (error) {
    return apiError(error, 'members.remove');
  }
}
