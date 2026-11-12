import { currentUser, isUuid, readWorkspaceSnapshot, snapshotLimit, writeWorkspaceSnapshot } from '@/lib/server/workspace';
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
    return json(await readWorkspaceSnapshot(user.id, workspaceId));
  } catch (error) {
    return apiError(error, 'snapshot.read');
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { user, workspaceId } = await workspace(context);
    const { backup, expectedVersion } = await readJson(request, snapshotLimit + 1024);
    if (typeof expectedVersion !== 'number' || !Number.isInteger(expectedVersion) || expectedVersion < 0 || expectedVersion >= 2147483647) {
      throw new HttpError(400, 'A valid expected backup version is required.');
    }
    return json(await writeWorkspaceSnapshot(user.id, workspaceId, backup, expectedVersion));
  } catch (error) {
    return apiError(error, 'snapshot.write');
  }
}
