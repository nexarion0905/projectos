import { defineConfig, devices } from '@playwright/test';

const target = process.env.PROJECTOS_STAGING_URL;
if (!target || process.env.PROJECTOS_STAGING_SMOKE !== 'true') {
  throw new Error('Set the explicitly authorized disposable HTTPS staging origin and PROJECTOS_STAGING_SMOKE=true.');
}
const url = new URL(target);
if (url.protocol !== 'https:' || url.origin !== target) throw new Error('Use the exact HTTPS staging origin.');
if (!process.env.PROJECTOS_STAGING_STORAGE_STATE) throw new Error('Provide a local Vercel preview browser state file.');

export default defineConfig({
  testDir: './tests/staging',
  workers: 1,
  timeout: 120_000,
  use: { baseURL: target, storageState: process.env.PROJECTOS_STAGING_STORAGE_STATE, ...devices['Desktop Chrome'] },
});
