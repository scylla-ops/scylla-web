import { describe, it, expect } from 'vitest';
import { compileRoutes, loadExtensions } from '@scylla/core';
import { extensions } from '../extensions.ts';

/**
 * Every page of the app, enumerated from the routes that all the extensions
 * compile to: a new page with no `permission` fails this suite. A sidebar link
 * takes its route's permission. A page is checked when it is behind the sign-in:
 * in the shell, or in a mount with a layout (the public pages have neither).
 */

const app = loadExtensions(extensions);

const guardedPages = compileRoutes(app.router).routes.flatMap(route =>
  (route.shell || route.layout) && route.page
    ? [{ id: `/${route.path.join('/')}`, permission: route.permission }]
    : [],
);

/** A ratchet: it may shrink, never grow. Each entry says why the page has no permission. */
const UNGATED_PAGES: Readonly<Record<string, string>> = {
  '/':
    'The landing of the shell: it only sends the user on to the dashboard of an organization, ' +
    'which declares its own permission.',
  '/:organizationSlug/users/:userId':
    'The page checks READ_USER itself, after it sends the own id to the account page: an old ' +
    'link to /users/<own id> must not end on a denial for a user without READ_USER.',
  '/:organizationSlug/account':
    'The account of the signed-in user. Every call of the page is on the own id, which the ' +
    'backend allows with no grant (GetMe, UpdateUser, ChangePassword, DeleteAccount, ...): no ' +
    'permission exists to declare.',
  '/account':
    'The same account page outside any organization, for a user who has none yet (a user that ' +
    'an administrator made, a new sign-up). The same reason: every call is on the own id.',
  '/:organizationSlug/marketplace':
    'TRIAGE: the page reads a hardcoded catalog — DefaultMarketplaceRepository calls no backend, ' +
    'so there is nothing to deny yet, and the enum has no marketplace permission to declare. ' +
    'Gate it when the real data layer lands.',
  '/:organizationSlug/extensions':
    'TRIAGE: the page lists the extensions the app itself runs, read from the core — no backend ' +
    'call, no data a user could be denied. Gate it when installing or disabling an extension ' +
    'lands, with the permission the backend enforces for that.',
};

describe('module permission declarations', () => {
  // Enumerating nothing would pass: make sure there is something to check.
  it('finds the registry pages it is supposed to check', () => {
    expect(guardedPages.length).toBeGreaterThan(10);
    expect(app.shell.entries.length).toBeGreaterThan(0);
  });

  describe('every page behind the sign-in declares a permission', () => {
    it.each(guardedPages.map(page => [page.id, page] as const))('%s', (id, page) => {
      if (id in UNGATED_PAGES) {
        expect(
          page.permission,
          `${id} now declares a permission — drop it from UNGATED_PAGES, the list only shrinks.`,
        ).toBeUndefined();
        return;
      }

      expect(
        page.permission,
        `${id} renders a page that anyone logged in can reach. Declare a \`permission\` on the ` +
          'route in its `*.module.ts` — the guard and the sidebar both read it. If the page ' +
          'genuinely needs none, add it to UNGATED_PAGES with the reason.',
      ).toBeDefined();
    });
  });

  it('the ungated list names only routes that still exist', () => {
    const known = new Set(guardedPages.map(page => page.id));
    const stale = Object.keys(UNGATED_PAGES).filter(id => !known.has(id));

    expect(stale, 'these UNGATED_PAGES entries match no route — delete them').toEqual([]);
  });
});
