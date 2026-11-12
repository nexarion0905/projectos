import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('creates, opens and retains a local project under the enforced policy', async ({ page }) => {
  const policyErrors: string[] = [];
  page.on('console', (entry) => {
    if (entry.type() === 'error' && /Content Security Policy/.test(entry.text())) policyErrors.push(entry.text());
  });
  const response = await page.goto('/');
  const headers = response!.headers();
  expect(headers['content-security-policy']).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(headers['content-security-policy']).not.toContain('unsafe-eval');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
  await page.getByRole('button', { name: 'My Projects', exact: true }).click();
  await page.getByText('Create project', { exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a project' });
  await expect(dialog.getByLabel('Project name')).toBeFocused();
  await dialog.getByLabel('Project name').fill('Browser fixture project');
  await dialog.getByRole('button', { name: 'Save record' }).click();
  const project = page.getByRole('main').getByRole('heading', { name: 'Browser fixture project', exact: true });
  await expect(project).toBeVisible();
  await project.click();
  await expect(page.getByRole('dialog', { name: 'Browser fixture project' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'My Projects', exact: true }).click();
  await expect(project).toBeVisible();
  expect(policyErrors).toEqual([]);
});

test('mobile navigation fits and the account form passes an automated accessibility scan', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'My Projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.goto('/auth/sign-in');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email')).toBeFocused();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});

test('leaves private endpoints uncached and reloads only the local shell offline', async ({ page, context, request }) => {
  const unavailable = await request.get('/api/workspaces');
  expect(unavailable.status()).toBe(503);
  expect(unavailable.headers()['cache-control']).toContain('no-store');
  expect((await request.get('/api/health')).status()).toBe(200);
  expect((await request.get('/api/auth/admin/list-users')).status()).toBe(404);
  expect((await request.get('/api/auth/get-session')).status()).toBe(503);
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'My Projects', exact: true }).click();
  await page.goto('/cloud');
  await expect(page.getByRole('heading', { name: 'Cloud workspaces unavailable' })).toBeVisible();
  const cached = await page.evaluate(async () => {
    const cache = await caches.open('projectos-shell-v2');
    return (await cache.keys()).map((entry) => new URL(entry.url).pathname);
  });
  expect(cached).toContain('/');
  expect(cached.some((path) => /^\/(api|auth|cloud)(\/|$)/.test(path))).toBe(false);
  await context.setOffline(true);
  await page.goto('/');
  await page.getByRole('button', { name: 'My Projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();
  await expect(page.evaluate(() => fetch('/api/workspaces'))).rejects.toThrow();
});

test('prunes a previous service worker cache and leaves unrelated caches intact', async ({ page }) => {
  await page.goto('/offline.html');
  await page.evaluate(async () => {
    await caches.open('projectos-shell-v1');
    await caches.open('unrelated-app');
  });
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(expect.arrayContaining(['unrelated-app', 'projectos-shell-v2']));
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).includes('projectos-shell-v1'))).toBe(false);
});
