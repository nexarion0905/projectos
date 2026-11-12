import { assertWorkspaceAccess, currentUser, isUuid } from '@/lib/server/workspace';
import { apiError, HttpError, json, readJson } from '@/lib/server/http';
import { createUploadUrl } from '@/lib/server/storage';

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    const { workspaceId, contentType, byteSize } = await readJson(request);
    if (process.env.PROJECTOS_STORAGE_ENABLED !== 'true') throw new HttpError(503, 'Cloud uploads are unavailable.');
    if (typeof workspaceId !== 'string' || !isUuid(workspaceId) || typeof contentType !== 'string'
      || typeof byteSize !== 'number' || !Number.isInteger(byteSize) || byteSize < 1 || byteSize > 1_048_576) {
      throw new HttpError(400, 'Invalid upload request.');
    }
    await assertWorkspaceAccess(user.id, workspaceId, 'editor');
    const key = `${workspaceId}/${crypto.randomUUID()}`;
    return json({ key, url: await createUploadUrl(key, contentType, byteSize), expiresIn: 60 });
  } catch (error) {
    return apiError(error, 'storage.presign');
  }
}
