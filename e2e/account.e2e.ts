import { expect, test } from '@playwright/test';
import { PASSWORD, newEmail, signIn, signUpAndIn } from './support.ts';

test('a new person signs up, verifies the email and signs in to a personal workspace', async ({
  page,
}) => {
  const slug = await signUpAndIn(page, newEmail('ada'));

  expect(slug).not.toBe('');
  await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible();
});

test('a reload keeps the session: the cookie gives a new access token', async ({ page }) => {
  const email = newEmail('eve');
  const slug = await signUpAndIn(page, email);

  await page.goto(`/${slug}/projects`);
  await page.reload();

  await expect(page).toHaveURL(new RegExp(`/${slug}/projects$`));
});

test('a wrong password shows the refusal and keeps the user on the sign-in page', async ({
  page,
}) => {
  const email = newEmail('bob');
  await signUpAndIn(page, email);
  await page.context().clearCookies();

  await page.goto('/login');
  await page.getByLabel('Email or username').fill(email);
  await page.getByLabel('Password').fill(`${PASSWORD}-wrong`);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText('Incorrect credentials')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('sign-out closes the session on the server', async ({ page }) => {
  const email = newEmail('ida');
  await signUpAndIn(page, email);

  await page.getByRole('button', { name: /Ada Lovelace/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await page.waitForURL(/\/login/);
  await page.goto('/');

  await expect(page).toHaveURL(/\/login/);
  // The account still works: only the session ended.
  await signIn(page, email);
});
