import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page, prefix: string) {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) throw new Error('Configure two pre-verified disposable staging accounts.');
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in to ProjectOS' }).click();
  await expect(page.getByRole('link', { name: 'Cloud workspaces' })).toBeVisible();
}

async function api(page: Page, path: string, method = 'GET', body?: unknown) {
  return page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(path, {
      method,
      cache: 'no-store',
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  }, { path, method, body });
}

test('live staging login, isolation, persistence, role revocation and logout', async ({ page, browser }, testInfo) => {
  const otherContext = await browser.newContext({
    baseURL: String(testInfo.project.use.baseURL),
    storageState: testInfo.project.use.storageState,
  });
  try {
    const other = await otherContext.newPage();
    await signIn(page, 'PROJECTOS_STAGE_OWNER');
    await signIn(other, 'PROJECTOS_STAGE_VIEWER');
    expect(await api(page, '/api/health')).toMatchObject({ status: 200, body: { mode: 'cloud' } });
    const outsider = await api(other, '/api/workspaces');
    expect(outsider.status).toBe(200);
    const userId: string = outsider.body.accountId;
    const label = `Smoke ${crypto.randomUUID()}`;
    await page.getByRole('link', { name: 'Cloud workspaces' }).click();
    await page.getByLabel('Workspace name').fill(label);
    await page.getByLabel('Workspace type').selectOption('team');
    await page.getByRole('button', { name: 'Create workspace' }).click();
    await expect(page.getByLabel('Open workspace').locator('option:checked')).toHaveText(`${label} (owner)`);
    const id = await page.getByLabel('Open workspace').inputValue();
    const base = `/api/workspaces/${id}`;
    const backup = { app: 'ProjectOS', schemaVersion: 1, exportedAt: new Date().toISOString(),
      data: { projects: [], tasks: [], milestones: [], research: [], nodes: [], edges: [] } };
    expect((await api(other, `${base}/snapshot`)).status).toBe(403);
    expect((await api(page, `${base}/snapshot`, 'PUT', { backup, expectedVersion: 0 })).status).toBe(200);
    expect((await api(page, `${base}/snapshot`, 'PUT', { backup, expectedVersion: 0 })).status).toBe(409);
    expect((await api(page, `${base}/members`, 'POST', { userId, role: 'viewer' })).status).toBe(201);
    expect(await api(other, `${base}/snapshot`)).toMatchObject({ status: 200, body: { version: 1 } });
    expect((await api(other, `${base}/snapshot`, 'PUT', { backup, expectedVersion: 1 })).status).toBe(403);
    expect((await api(page, `${base}/members`, 'DELETE', { userId })).status).toBe(200);
    expect((await api(other, `${base}/snapshot`)).status).toBe(403);
    await page.goto('/auth/account');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in to ProjectOS' })).toBeVisible();
    expect((await api(page, `${base}/snapshot`)).status).toBe(401);
  } finally {
    await otherContext.close();
  }
});
