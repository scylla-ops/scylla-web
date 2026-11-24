import { expect, type Page } from '@playwright/test';

/** The API of Mailpit, where the CE server of the tests sends its mails. */
const MAILPIT = process.env.SCYLLA_E2E_MAILPIT ?? 'http://127.0.0.1:51080';

export const PASSWORD = 'correct horse battery';

/** A new address for each run: the database keeps the users of the runs before. */
export const newEmail = (name: string): string => `${name}+${Date.now()}@example.com`;

interface MailpitList {
  messages?: { ID: string }[];
}

interface MailpitMessage {
  Text: string;
}

/** The link of the last mail to `email` that goes to `page`, e.g. `verify-email`. */
export const mailLink = async (email: string, page: string): Promise<string> => {
  const pattern = new RegExp(`https?://\\S+/${page}#token=\\S+`);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const query = encodeURIComponent(`to:${email}`);
    const list = (await (
      await fetch(`${MAILPIT}/api/v1/search?query=${query}`)
    ).json()) as MailpitList;
    for (const { ID } of list.messages ?? []) {
      const message = (await (
        await fetch(`${MAILPIT}/api/v1/message/${ID}`)
      ).json()) as MailpitMessage;
      const link = pattern.exec(message.Text)?.[0];
      if (link) return link;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`no ${page} mail for ${email}`);
};

/** Closes the release notes and the onboarding tour, which a new browser shows once. */
export const dismissOverlays = async (page: Page): Promise<void> => {
  for (const name of ['Got it', 'Skip', 'Skip the tour']) {
    const button = page.getByRole('button', { name, exact: true }).first();
    await button.waitFor({ timeout: 1000 }).catch(() => undefined);
    if (await button.isVisible().catch(() => false)) await button.click();
  }
};

/** Signs up and opens the link of the mail. */
export const signUp = async (page: Page, email: string, name = 'Ada Lovelace') => {
  await page.goto('/sign-up');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm the password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create the account' }).click();
  await expect(page.getByRole('status')).toContainText('We sent a link');

  await page.goto(await mailLink(email, 'verify-email'));
  await expect(page.getByText('Your email address is verified')).toBeVisible();
};

/** Signs up and signs in. Gives the slug of the personal workspace. */
export const signUpAndIn = async (page: Page, email: string, name = 'Ada Lovelace') => {
  await signUp(page, email, name);
  return signIn(page, email);
};

/** Signs in and leaves the overlays open: a spec can check which of them show. */
export const openSession = async (page: Page, email: string): Promise<void> => {
  await page.goto('/login');
  await page.getByLabel('Email or username').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'));
};

export const signIn = async (page: Page, email: string): Promise<string> => {
  await openSession(page, email);
  await page.waitForTimeout(1000);
  await dismissOverlays(page);
  await dismissOverlays(page);
  return new URL(page.url()).pathname.split('/')[1];
};
