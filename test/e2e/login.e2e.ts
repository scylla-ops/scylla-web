import { expect, test } from '@playwright/test';

test('the sign-in page renders without a backend', async ({ page }) => {
  await page.goto('/login');

  await expect(page).toHaveTitle(/Scylla/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByLabel('Email or username')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('a URL of the app sends a visitor without a session to the sign-in page', async ({
  page,
}) => {
  await page.goto('/acme/projects/web/secrets');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
