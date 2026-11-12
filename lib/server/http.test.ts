import { describe, expect, it } from 'vitest';
import { apiError, readJson } from './http';

const url = 'http://localhost:3000/api/workspaces';
function request(body: string, origin = 'http://localhost:3000', contentType = 'application/json') {
  return new Request(url, { method: 'POST', body, headers: { origin, 'content-type': contentType } });
}

describe('private API request boundary', () => {
  it('rejects cross-origin writes, unsupported media and non-object bodies', async () => {
    await expect(readJson(request('{}', 'https://other.example'))).rejects.toMatchObject({ status: 403 });
    await expect(readJson(request('{}', 'http://localhost:3000', 'text/plain'))).rejects.toMatchObject({ status: 415 });
    await expect(readJson(request('[]'))).rejects.toMatchObject({ status: 400 });
  });
  it('enforces the streaming byte limit before parsing', async () => {
    await expect(readJson(request('{"data":"🙂"}'), 12)).rejects.toMatchObject({ status: 413 });
    await expect(readJson(request('{"name":"Team"}'))).resolves.toEqual({ name: 'Team' });
  });
  it('redacts backend errors and disables private response caching', async () => {
    const response = apiError(new Error('test-only credential'), 'test');
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.text()).not.toContain('test-only credential');
  });
});
