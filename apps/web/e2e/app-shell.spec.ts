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
