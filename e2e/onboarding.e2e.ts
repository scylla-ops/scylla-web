import { expect, test, type Page } from '@playwright/test';
import { newEmail, signUpAndIn } from './support.ts';

const card = (page: Page) => page.locator('[data-tour-focus]');

/** The step that opens the page of a new agent, from a user with no tour in progress. */
const openAgentForm = async (page: Page, slug: string) => {
  await page.goto(`/${slug}/agents`);
  await page.locator('[data-tour-offer="agent"]').getByRole('button', { name: 'Start' }).click();
  await card(page).getByRole('button', { name: 'Add an agent' }).click();
  await expect(card(page).getByRole('heading', { name: 'Name your agent' })).toBeVisible();
  return page.locator('[data-tour="add-agent-form"]');
};

/** The step that opens the dialog of a new project, from a user with no tour in progress. */
const openProjectDialog = async (page: Page, slug: string) => {
  await page.goto(`/${slug}/projects`);
  await page.locator('[data-tour-offer="pipeline"]').getByRole('button', { name: 'Start' }).click();
  await card(page).getByRole('button', { name: 'New project' }).click();
  await expect(card(page).getByRole('heading', { name: 'Name your project' })).toBeVisible();
  return page.getByRole('dialog');
};

test('only Skip leaves a step that lives in a dialog', async ({ page }) => {
  const slug = await signUpAndIn(page, newEmail('tour-hold'));
  const dialog = await openProjectDialog(page, slug);

  await page.keyboard.press('Escape');
  await page.mouse.click(5, 400);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeHidden();
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeHidden();

  await card(page).getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByText('Skip the tour?')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Skip the tour?')).toBeHidden();
  await expect(dialog).toBeVisible();

  await card(page).getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Skip the tour', exact: true }).click();
  await expect(card(page)).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('Tab stays on the step and reaches Skip', async ({ page }) => {
  const slug = await signUpAndIn(page, newEmail('tour-tab'));
  await openAgentForm(page, slug);

  const inTour = page.locator('[data-tour-focus] :focus, [data-tour="add-agent-form"] :focus');
  const skip = card(page).locator('button:focus', { hasText: /^\s*Skip\s*$/ });
  let reachedSkip = false;
  for (let press = 0; press < 8; press += 1) {
    await page.keyboard.press('Tab');
    await expect(inTour).toHaveCount(1);
    reachedSkip ||= (await skip.count()) === 1;
  }
  expect(reachedSkip).toBe(true);
});

test('the real Create of the pipeline editor takes the click inside the larger spot', async ({
  page,
}) => {
  const slug = await signUpAndIn(page, newEmail('tour-nested'));
  await page.goto(`/${slug}/projects`);
  await page.locator('[data-tour-offer="pipeline"]').getByRole('button', { name: 'Start' }).click();
  await card(page).getByRole('button', { name: 'New project' }).click();
  await page.getByLabel(/Project name/).fill('tour');
  await card(page).getByRole('button', { name: 'Create Project' }).click();
  await page.locator('[data-tour="project-card"]').click();
  await card(page)
    .getByRole('button', { name: /pipeline/i })
    .click();
  await expect(card(page).getByRole('heading', { name: 'Create your pipeline' })).toBeVisible();

  await page.locator('[data-tour="pipeline-submit"]').click();

  await expect(card(page)).toBeHidden();
  await expect(page).not.toHaveURL(/\/create$/);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the first step points at the menu button, and the menu leads on', async ({ page }) => {
    const slug = await signUpAndIn(page, newEmail('tour-phone'));
    await page.goto(`/${slug}/help/tours`);
    await page.locator('[data-tour-row="agent"]').getByRole('button').first().click();
    await expect(card(page).getByRole('heading', { name: 'Open Agents' })).toBeVisible();

    await page.locator('[data-sidebar="trigger"]').click();
    await page.locator('[data-nav-group="machines"]').click();
    await page.locator('[data-nav-url="agents"]').click();

    await expect(card(page).getByRole('heading', { name: 'Add an agent' })).toBeVisible();
  });
});
