export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export function apiError(error: unknown, operation: string) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '42501') {
    return json({ error: 'Operation denied.' }, 403);
  }
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
    return json({ error: 'Account or workspace is unavailable.' }, 400);
  }
  console.error(JSON.stringify({ event: 'projectos_api_failure', operation }));
  return json({ error: 'Cloud service unavailable.' }, 503);
}

export function assertSameOrigin(request: Request) {
  const configuredOrigin = process.env.PROJECTOS_ORIGIN;
  const origin = configuredOrigin || new URL(request.url).origin;
  if (request.headers.get('origin') !== origin) throw new HttpError(403, 'Request origin denied.');
}

export async function readJson(request: Request, limit = 4096): Promise<Record<string, unknown>> {
  assertSameOrigin(request);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new HttpError(415, 'Expected JSON.');
  }
  if (!request.body) throw new HttpError(400, 'Request body is required.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let content = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError(413, 'Request is too large.');
      }
      content += decoder.decode(value, { stream: true });
    }
    const parsed: unknown = JSON.parse(content + decoder.decode());
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Malformed JSON.');
  } finally {
    reader.releaseLock();
  }
}
