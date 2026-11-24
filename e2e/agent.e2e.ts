import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { newEmail, signUpAndIn } from './support.ts';

/** The `scylla-agent` binary of the backend. The spec is skipped without it. */
const AGENT = process.env.SCYLLA_AGENT_BIN;
const SERVER = process.env.SCYLLA_E2E_URL ?? 'http://127.0.0.1:3000';

let agent: ChildProcess | undefined;
test.afterEach(() => agent?.kill());

test('an agent joins with its code, runs the job of a pipeline, and its logs show', async ({
  page,
}) => {
  test.skip(!AGENT, 'SCYLLA_AGENT_BIN is not set');
  const slug = await signUpAndIn(page, newEmail('linus'));

  // A project with the pipeline of the editor: two nodes that echo a line each.
  await page.goto(`/${slug}/projects`);
  await page
    .getByRole('button', { name: /New project/ })
    .first()
    .click();
  await page.getByLabel(/Project name/).fill('ci');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Create/ })
    .click();
  await page.getByText('ci', { exact: true }).first().click();
  await expect(page.getByRole('heading', { name: /Pipelines/ })).toBeVisible();
  const projectPath = new URL(page.url()).pathname;
  await page.goto(`${projectPath}/create`);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Pipeline created')).toBeVisible();

  // An agent: its code joins the binary, which then opens its stream.
  await page.goto(`/${slug}/agents`);
  await page
    .getByRole('button', { name: /Add an agent/ })
    .first()
    .click();
  const form = page.locator('[data-tour="add-agent-page"]');
  await form.getByLabel('Name').fill('runner-1');
  await form.getByRole('button', { name: 'Add agent' }).click();
  await expect(form.getByRole('button', { name: /Linux/, pressed: true })).toBeVisible();
  await expect(page).toHaveURL(/\/agents\/[^/]+\/connect$/);
  const command = await form.locator('pre').first().innerText();
  const code = /sh -s -- (\S+) --url/.exec(command)![1];
  const config = join(mkdtempSync(join(tmpdir(), 'scylla-agent-')), 'agent.json');
  execFileSync(AGENT!, ['--config', config, 'join', SERVER, code]);
  agent = spawn(AGENT!, ['--config', config, 'run'], { stdio: 'ignore' });
  await expect(form.getByText('runner-1 is online')).toBeVisible({ timeout: 30_000 });
  await form.getByRole('button', { name: 'Open agent' }).click();
  await expect(page.locator('[data-tour="agent-status"][data-online="true"]')).toBeVisible();

  // The run: the job ends in success, and the log of a node has its line.
  await page.goto(projectPath);
  await page.locator('[data-tour="pipeline-run"]').first().click();
  await page.locator('[data-tour="pipeline-history"] [data-item-id]').first().click();
  await expect(page.getByText('Success').first()).toBeVisible({ timeout: 60_000 });
  await page.getByText('welcome', { exact: true }).first().click();
  await expect(page.getByText('Welcome to Scylla!')).toBeVisible();
});
