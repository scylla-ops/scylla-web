import { expect, test } from '@playwright/test';
import { newEmail, signUpAndIn } from './support.ts';

test('a project gets a secret and a pipeline', async ({ page }) => {
  const slug = await signUpAndIn(page, newEmail('grace'));

  await page.goto(`/${slug}/projects`);
  await page
    .getByRole('button', { name: /New project/ })
    .first()
    .click();
  await page.getByLabel(/Project name/).fill('web');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Create/ })
    .click();
  await page.getByText('web', { exact: true }).first().click();
  await expect(page.getByRole('heading', { name: /Pipelines/ })).toBeVisible();
  const projectPath = new URL(page.url()).pathname;

  await page.locator('[data-nav-url="secrets"]').click();
  await page
    .getByRole('button', { name: /New secret|Create secret|Add/ })
    .first()
    .click();
  await page.getByLabel(/Secret name/).fill('API_TOKEN');
  await page.getByLabel(/^Value/).fill('s3cr3t');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Create|Save|Add/ })
    .last()
    .click();
  await expect(page.getByText('API_TOKEN').first()).toBeVisible();

  await page.goto(`${projectPath}/create`);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Pipeline created')).toBeVisible();
});

test('an invalid slug of a new workspace shows the refusal of the server', async ({ page }) => {
  const slug = await signUpAndIn(page, newEmail('alan'));

  await page
    .getByRole('button', { name: /Personal/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: /Create a workspace/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Workspace name').fill('Taken');
  await dialog.getByLabel('Address').fill(slug);
  await dialog.getByRole('button', { name: /Create/ }).click();

  await expect(page.getByText('Another workspace already uses this slug')).toBeVisible();
});
