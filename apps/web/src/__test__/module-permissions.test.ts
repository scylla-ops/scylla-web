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
  '/change-email':
    'The link of a mail: it changes the email of the account of the session, which needs no grant.',
  '/':
    'The landing of the shell: it only sends the user on to the dashboard of a workspace, ' +
    'which declares its own permission.',
  '/:workspaceSlug/instance/users/:userId':
    'The page checks READ_USER itself, after it sends the own id to the account page: a link ' +
    'to /users/<own id> must not end on a denial for a user without READ_USER.',
  '/:workspaceSlug/account/:section':
    'The account of the signed-in user, one section per page. Every call of the page is on the own id, which the ' +
    'backend allows with no grant (GetMe, UpdateUser, ChangePassword, DeleteAccount, ...): no ' +
    'permission exists to declare.',
  '/account/:section':
    'The same account page outside any workspace, for a user who has none yet (a user that ' +
    'an administrator made, a new sign-up). The same reason: every call is on the own id.',
  '/:workspaceSlug/help/tours':
    'The guided tours of the signed-in user: the page calls no backend, it reads and writes the ' +
    'progress of the tours in the browser. It lists only the tours whose permissions the user ' +
    'holds.',
  '/:workspaceSlug/notifications/:view':
    'The inbox of the signed-in user: each call of the page acts on the caller, which needs no ' +
    'grant, and no route takes a person.',
  '/notifications/:view':
    'The same inbox outside any workspace: an invitation reaches a user who has none yet. The ' +
    'same reason: each call acts on the caller.',
  '/integrations/github/callback':
    'GitHub sends the browser back here after the install of the App, out of any workspace. The ' +
    'server checks the state of the install: it is bound to the workspace and to the user that ' +
    'started it, and only an admin of that workspace can start it.',
  '/integrations/github/manifest':
    'GitHub sends the browser back here after the creation of the App of the server, out of any ' +
    'workspace, where the permissions of the platform are not loaded. The server checks ' +
    'complete_git_hub_manifest and the state, which is bound to the admin that started the flow.',
  '/:workspaceSlug/marketplace':
    'TRIAGE: the page reads a hardcoded catalog — DefaultMarketplaceRepository calls no backend, ' +
    'so there is nothing to deny yet, and the enum has no marketplace permission to declare. ' +
    'Gate it when the real data layer lands.',
};

const commands = app.extensions
  .flatMap(({ modules }) => modules)
  .flatMap(module => module.commands ?? []);

/** A ratchet too. Each entry says why the command needs no permission. */
const UNGATED_COMMANDS: Readonly<Record<string, string>> = {
  'shell.language-en': 'A preference of this device: it calls no backend.',
  'shell.language-fr': 'A preference of this device: it calls no backend.',
  'user.theme-light': 'A preference of this device: it calls no backend.',
  'user.theme-dark': 'A preference of this device: it calls no backend.',
  'user.theme-system': 'A preference of this device: it calls no backend.',
  'login.sign-out': 'It ends the own session, which needs no grant.',
  'notifications.open': 'The inbox of the caller, which needs no grant.',
  'notifications.mark-all-read': 'It acts on the inbox of the caller, which needs no grant.',
};

describe('module permission declarations', () => {
  // Enumerating nothing would pass: make sure there is something to check.
  it('finds the registry pages it is supposed to check', () => {
    expect(guardedPages.length).toBeGreaterThan(4);
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

  it('finds the commands it is supposed to check', () => {
    expect(commands.length).toBeGreaterThan(Object.keys(UNGATED_COMMANDS).length);
  });

  describe('every command of the bar declares a permission', () => {
    it.each(commands.map(command => [command.id, command] as const))('%s', (id, command) => {
      if (id in UNGATED_COMMANDS) {
        expect(
          command.permission,
          `${id} now declares a permission — drop it from UNGATED_COMMANDS, the list only shrinks.`,
        ).toBeUndefined();
        return;
      }

      expect(
        command.permission,
        `${id} shows to all users. Declare a \`permission\` on the command. If it genuinely ` +
          'needs none, add it to UNGATED_COMMANDS with the reason.',
      ).toBeDefined();
    });
  });

  it('the ungated commands still exist', () => {
    const known = new Set(commands.map(command => command.id));
    const stale = Object.keys(UNGATED_COMMANDS).filter(id => !known.has(id));

    expect(stale, 'these UNGATED_COMMANDS entries match no command — delete them').toEqual([]);
  });
});
