import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env['E2E_PORT'] ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Runs against the production build; run `pnpm build` first.
  webServer: {
    command: `pnpm exec next start --port ${port} --hostname 127.0.0.1`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
    // The sample page is served by the app itself on localhost, so private targets are allowed here only.
    env: {
      INSPECTOR_ALLOW_PRIVATE_HOSTS: 'true',
      STORAGE_DRIVER: 'memory',
      DATABASE_URL: '',
      AUDIT_EXECUTION: 'inline',
      APP_URL: baseURL,
    },
  },
});
