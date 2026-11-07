import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { newEmail, openSession, signIn, signUp, signUpAndIn } from './support.ts';

interface Place {
  x: number;
  y: number;
}

const BASE_URL = process.env.SCYLLA_E2E_URL ?? 'http://127.0.0.1:3000';
const USER_STATE = '**/UserStateService/*';

/** The written value has reached the server: another device can read it now. */
const saved = (page: Page, key: string) =>
  page.waitForResponse(
    response =>
      response.url().endsWith('/PutUserStateEntry') &&
      response.ok() &&
      (response.request().postDataBuffer()?.includes(key) ?? false),
  );

const newDevice = async (browser: Browser) => {
  const context = await browser.newContext({ baseURL: BASE_URL });
  return { context, page: await context.newPage() };
};

const welcomeDialog = (page: Page) => page.getByRole('button', { name: 'Got it', exact: true });
const tourOffer = (page: Page) => page.getByRole('button', { name: 'Skip', exact: true });

const newPipeline = async (page: Page, slug: string) => {
  await page.goto(`/${slug}/projects`);
  await page
    .getByRole('button', { name: /New project/ })
    .first()
    .click();
  await page.getByLabel(/Project name/).fill('places');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await page.locator('[data-tour="project-card"]').click();
  await page.waitForURL(/\/projects\/[^/]+/);
  await page.goto(`${new URL(page.url()).pathname}/create`);
  await page
    .getByRole('button', { name: /Bash script/ })
    .first()
    .click();
};

const scriptNode = (page: Page) =>
  page.locator('.svelte-flow__node:not(.svelte-flow__node-startNode)').first();
const startNode = (page: Page) => page.locator('.svelte-flow__node-startNode').first();

/** The place in the graph, not on the screen: the zoom of the canvas changes the screen. */
const placeOf = async (node: Locator): Promise<Place> => {
  const style = await node.getAttribute('style');
  const [, x, y] = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(style ?? '') ?? [];
  return { x: Number(x), y: Number(y) };
};

/** The server keeps whole numbers. */
const expectSamePlace = (actual: Place, expected: Place) => {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(1);
};

/** The canvas fits its view after the load: a press during this move misses the node. */
const settledBox = async (node: Locator) => {
  let box = await node.boundingBox();
  await expect(async () => {
    const before = box;
    await node.page().waitForTimeout(200);
    box = await node.boundingBox();
    expect(box).not.toBeNull();
    expect(box).toEqual(before);
  }).toPass();
  if (!box) throw new Error('the node has no box');
  return box;
};

const dragNode = async (node: Locator, by: Place) => {
  const box = await settledBox(node);
  const page = node.page();
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + by.x / 2, from.y + by.y / 2, { steps: 5 });
  await page.mouse.move(from.x + by.x, from.y + by.y, { steps: 5 });
  await page.mouse.up();
};

test('a new device gets the choices of the person, and shows no dialog again', async ({
  browser,
  page,
}) => {
  const email = newEmail('state');
  const slug = await signUpAndIn(page, email);

  await page.goto(`/${slug}/account/appearance`);
  const themeSaved = saved(page, 'theme');
  await page.getByRole('radio', { name: 'Light' }).click();
  await themeSaved;

  await page
    .getByRole('button', { name: /Ada Lovelace/ })
    .first()
    .click();
  const localeSaved = saved(page, 'locale');
  await page.getByRole('menuitemradio', { name: 'Français' }).click();
  await localeSaved;

  const { context, page: other } = await newDevice(browser);
  await openSession(other, email);

  await expect(other.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(other.locator('html')).not.toHaveClass(/\bdark\b/);
  expect(await other.evaluate(() => localStorage.getItem('scylla-theme'))).toBe('light');
  await other.waitForTimeout(2000);
  await expect(welcomeDialog(other)).toBeHidden();
  await expect(tourOffer(other)).toBeHidden();
  await context.close();
});

test('a new device opens the last workspace of the person', async ({ browser, page }) => {
  const email = newEmail('state-workspace');
  await signUpAndIn(page, email);

  await page
    .getByRole('button', { name: /Personal/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: /Create a workspace/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Workspace name').fill('Second');
  const address = `second-${Date.now()}`;
  await dialog.getByLabel('Address').fill(address);
  const workspaceSaved = saved(page, 'last-workspace');
  await dialog.getByRole('button', { name: /Create/ }).click();
  await workspaceSaved;

  const { context, page: other } = await newDevice(browser);
  await signIn(other, email);

  expect(new URL(other.url()).pathname.split('/')[1]).toBe(address);
  await context.close();
});

test('the places come back on a new device: a new node with Create, a saved node at once', async ({
  browser,
  page,
}) => {
  const email = newEmail('state-places');
  const slug = await signUpAndIn(page, email);
  await newPipeline(page, slug);
  await page.getByLabel('Pipeline name').fill('places');
  await page.locator('.cm-content:visible').first().fill('echo places');

  await expect(scriptNode(page)).toBeVisible();
  await dragNode(scriptNode(page), { x: 120, y: 90 });
  await dragNode(startNode(page), { x: -100, y: 40 });
  const created = {
    script: await placeOf(scriptNode(page)),
    start: await placeOf(startNode(page)),
  };

  await page.locator('[data-tour="pipeline-submit"]').click();
  await page.waitForURL(url => !url.pathname.endsWith('/create'));
  await page.getByRole('button', { name: 'Edit pipeline' }).first().click();
  await page.waitForURL(/\/edit\//);
  await expect(scriptNode(page)).toBeVisible();
  expectSamePlace(await placeOf(scriptNode(page)), created.script);
  expectSamePlace(await placeOf(startNode(page)), created.start);

  const layoutSaved = page.waitForResponse(
    response => response.url().endsWith('/SavePipelineLayout') && response.ok(),
  );
  await dragNode(scriptNode(page), { x: 160, y: 120 });
  await layoutSaved;
  const moved = await placeOf(scriptNode(page));
  expect(moved).not.toEqual(created.script);

  await page.reload();
  await expect(scriptNode(page)).toBeVisible();
  expectSamePlace(await placeOf(scriptNode(page)), moved);
  expectSamePlace(await placeOf(startNode(page)), created.start);

  const editor = new URL(page.url()).pathname;
  const { context, page: other } = await newDevice(browser);
  await signIn(other, email);
  await other.goto(editor);
  await expect(scriptNode(other)).toBeVisible();
  expectSamePlace(await placeOf(scriptNode(other)), moved);
  await context.close();
});

test('the node style follows the person', async ({ browser, page }) => {
  const email = newEmail('state-style');
  const slug = await signUpAndIn(page, email);
  await newPipeline(page, slug);

  const group = page.getByRole('group', { name: 'Node style' });
  const items = group.getByRole('radio');
  const pressed = group.locator('[data-state="on"]');
  const first = await pressed.innerText();
  const styleSaved = saved(page, 'node-appearance');
  await items.filter({ hasNotText: first }).first().click();
  await styleSaved;
  const chosen = await pressed.innerText();
  expect(chosen).not.toBe(first);

  const projectUrl = new URL(page.url()).pathname;
  const { context, page: other } = await newDevice(browser);
  await signIn(other, email);
  await other.goto(projectUrl);
  await expect(
    other.getByRole('group', { name: 'Node style' }).locator('[data-state="on"]'),
  ).toHaveText(chosen);
  await context.close();
});

test('a failed read shows no welcome, because a failure is not a new person', async ({
  browser,
  page,
}) => {
  const email = newEmail('state-down');
  await signUpAndIn(page, email);

  const { context, page: other } = await newDevice(browser);
  await other.route(USER_STATE, route => route.abort());
  await openSession(other, email);
  await other.waitForTimeout(2000);
  const whatsNew = welcomeDialog(other);
  if (await whatsNew.isVisible()) await whatsNew.click();
  await other.waitForTimeout(1000);

  await expect(tourOffer(other)).toBeHidden();
  await context.close();
});

test('a new person sees the release notes, then the welcome of the tour', async ({ page }) => {
  const email = newEmail('state-new');
  await signUp(page, email);
  await openSession(page, email);

  await welcomeDialog(page).click();

  await expect(tourOffer(page)).toBeVisible();
});
