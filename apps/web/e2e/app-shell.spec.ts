import { expect, test } from '@playwright/test';

test('root redirects to the dashboard inside the app shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Dashboard' }),
  ).toHaveAttribute('aria-current', 'page');
});

test('primary navigation reaches every section', async ({ page }) => {
  await page.goto('/dashboard');
  const nav = page.getByRole('navigation', { name: 'Primary' });

  for (const section of ['Projects', 'Audits', 'Settings']) {
    await nav.getByRole('link', { name: section }).click();
    await expect(page.getByRole('heading', { level: 1, name: section })).toBeVisible();
    await expect(nav.getByRole('link', { name: section })).toHaveAttribute('aria-current', 'page');
  }
});

test('the app shell never presents a page score', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByText(/\b\d{1,3}\s*\/\s*100\b/)).toHaveCount(0);
  await expect(page.getByText(/match score/i)).toHaveCount(0);
});

test('health endpoint reports ok', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: 'ok', service: 'web' });
});

test('responses carry security headers', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
});

test('cron cleanup requires its secret', async ({ request }) => {
  expect((await request.get('/api/cron/cleanup')).status()).toBe(401);
});

test('new audit without a project asks which project to check', async ({ page }) => {
  await page.goto('/audits/new');
  await expect(page.getByRole('heading', { level: 1, name: 'New audit' })).toBeVisible();
  await expect(page.getByText(/Create a project first|Choose a project/)).toBeVisible();
});

test('unknown pages show a not-found page with a way back', async ({ page }) => {
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('pages fit the screen and the menu opens', async ({ page }) => {
    for (const path of ['/dashboard', '/projects', '/audits', '/settings']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Projects' })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
  });
});
