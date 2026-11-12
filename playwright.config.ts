import { defineConfig, devices } from '@playwright/test';

const port = 3187;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser',
  forbidOnly: Boolean(process.env.CI),
  workers: 2,
  use: { baseURL },
  projects: [{ name: 'Chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/api/health`,
    env: { DATABASE_URL: '', NEON_AUTH_BASE_URL: '', NEON_AUTH_COOKIE_SECRET: '', PROJECTOS_CLOUD_REQUIRED: 'false' },
  },
});
