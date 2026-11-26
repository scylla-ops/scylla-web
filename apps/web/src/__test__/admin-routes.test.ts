import { describe, it, expect } from 'vitest';
import { compileRoutes, loadExtensions } from '@scylla/core';
import { extensions } from '../extensions.ts';

/** The administration of the server, as the app compiles it from every extension. */

const app = loadExtensions(extensions);
const routes = compileRoutes(app.router).routes;
const routeAt = (path: string) => routes.find(route => `/${route.path.join('/')}` === path);

const ADMIN_PAGES = [
  '/admin/users',
  '/admin/roles',
  '/admin/extensions',
  '/admin/git-providers',
  '/admin/settings',
  '/admin/mail',
  '/admin/legal',
];

describe('the administration of the server', () => {
  it.each(ADMIN_PAGES)('opens %s in the space of the administration, in the shell', path => {
    expect(routeAt(path)).toMatchObject({ space: 'instance', shell: true });
  });

  it('keeps the pages of a workspace out of the space', () => {
    expect(routeAt('/:workspaceSlug/dashboard')?.space).toBeUndefined();
  });

  it('puts the links of the administration in one section, grouped under headings', () => {
    const links = app.shell.entries.filter(entry => entry.section === 'instance');

    expect(links.map(link => link.url)).toEqual([
      'users',
      'roles',
      'extensions',
      'git-providers',
      'settings',
      'mail',
      'legal',
    ]);
    expect(links.map(link => link.heading?.message)).toEqual([
      'Users and roles',
      undefined,
      'Integrations',
      undefined,
      'Server',
      undefined,
      undefined,
    ]);
  });

  it.each([
    ['/:workspaceSlug/instance', '/admin'],
    ['/:workspaceSlug/instance/:page', '/admin/:page'],
    ['/:workspaceSlug/instance/:page/:id', '/admin/:page/:id'],
  ])('sends the old link %s on to %s', (path, target) => {
    expect(routeAt(path)?.redirect).toBe(target);
  });
});
