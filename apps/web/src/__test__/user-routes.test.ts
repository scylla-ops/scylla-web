import { describe, it, expect } from 'vitest';
import { compileRoutes, loadExtensions } from '@scylla/core';
import { Permission } from '@scylla/base-sdk';
import { extensions } from '../extensions.ts';

/** The routes of the accounts, as the app compiles them from every extension. */

const routes = compileRoutes(loadExtensions(extensions).router).routes;
const routeAt = (path: string) => routes.find(route => `/${route.path.join('/')}` === path);

describe('the routes of the accounts', () => {
  it('sends the old address of the own settings to the account page', () => {
    const redirect = routeAt('/:organizationSlug/users/me')?.redirect;

    expect(redirect).toBeDefined();
    // A relative target starts from the URL of the route.
    expect(new URL(redirect!, 'http://scylla/acme/users/me/').pathname).toBe('/acme/account');
  });

  it('leaves READ_USER to the page of a user, so the own id reaches its redirect', () => {
    expect(routeAt('/:organizationSlug/users/:userId')?.permission).toBeUndefined();
  });

  it('guards the directory with LIST_USERS', () => {
    expect(routeAt('/:organizationSlug/users')?.permission).toBe(Permission.LIST_USERS);
  });

  it('opens the account page inside the shell of an organization', () => {
    expect(routeAt('/:organizationSlug/account')?.shell).toBe(true);
  });

  it('opens the account page also without an organization: no shell, but a signed-in layout', () => {
    const route = routeAt('/account');

    expect(route?.shell).toBe(false);
    expect(route?.layout).toBeDefined();
    expect(route?.wrappers).toEqual([]);
  });

  it('opens the password reset pages outside the shell', () => {
    expect(routeAt('/forgot-password')?.shell).toBe(false);
    expect(routeAt('/reset-password')?.shell).toBe(false);
  });
});
