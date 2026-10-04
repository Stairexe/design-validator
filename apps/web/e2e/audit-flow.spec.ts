import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('runs an audit and shows the exact change to make (testing.md §8)', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Run sample audit' }).click();

  await expect(page).toHaveURL(/\/audits\/aud_/);
  // Processing screen, then results.
  await expect(page.getByRole('tab', { name: /differences/ })).toBeVisible({ timeout: 120_000 });

  await page.getByLabel('Search elements').fill('Button / Primary');
  await page.getByRole('button', { name: /Padding X\s+20px → 24px/ }).click();

  const detail = page.getByRole('article');
  await expect(detail.getByRole('heading', { name: 'Padding X' })).toBeVisible();
  await expect(detail.getByText('Current').locator('xpath=following-sibling::dd')).toHaveText(
    '20px',
  );
  await expect(detail.getByText('Required').locator('xpath=following-sibling::dd')).toHaveText(
    '24px',
  );
  await expect(detail.getByText('Change').locator('xpath=following-sibling::dd')).toHaveText(
    '+4px',
  );
  await expect(detail.getByText(/padding-inline: 24px;/)).toBeVisible();

  // No page-quality score anywhere in the primary result.
  await expect(page.getByText(/\b\d{1,3}\s*\/\s*100\b/)).toHaveCount(0);
  await expect(page.getByText(/score/i)).toHaveCount(0);
});

test('shows visual evidence and unresolved mappings', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/audits');
  await page.getByRole('link', { name: 'Sample: Pricing page' }).first().click();
  await expect(page.getByRole('tab', { name: 'Visual comparison' })).toBeVisible({
    timeout: 120_000,
  });
  await page.getByRole('tab', { name: 'Visual comparison' }).click();
  await expect(page.getByRole('img', { name: 'Website screenshot' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Design image' })).toBeVisible();
  await page.getByRole('tab', { name: 'Difference', exact: true }).click();
  await expect(page.getByRole('img', { name: /Pixel difference/ })).toBeVisible();
  await page.getByRole('tab', { name: /Unresolved mappings/ }).click();
  await expect(page.getByRole('table')).toContainText('Decorative');
});
