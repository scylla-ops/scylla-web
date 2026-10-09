import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installTestNavigator } from '@test/navigator.ts';
import { contextStore } from '../context.store.ts';
import { organizationUrl, scyllaNavigate } from '../scylla-navigate.ts';

let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  navigator = installTestNavigator();
  contextStore.setState({ organization: { id: 'org-1', name: 'Acme Corp' } });
});

afterEach(() => navigator.restore());

describe('scyllaNavigate', () => {
  it('opens the page of a user in the active organization', () => {
    scyllaNavigate.goToUser('user-2');

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/users/user-2', undefined);
  });

  it('opens the account of the session in the active organization', () => {
    scyllaNavigate.goToAccount();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/account', undefined);
  });
});

describe('organizationUrl', () => {
  it('gives the dashboard of any organization by default', () => {
    expect(organizationUrl('Beta Lab')).toBe('/beta-lab/dashboard');
  });

  it('gives another page of it on request', () => {
    expect(organizationUrl('Beta Lab', 'account')).toBe('/beta-lab/account');
  });
});
