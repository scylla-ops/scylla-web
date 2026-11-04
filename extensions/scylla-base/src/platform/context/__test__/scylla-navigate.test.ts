import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installTestNavigator } from '@test/navigator.ts';
import { contextStore } from '../context.store.ts';
import { organizationUrl, scyllaNavigate } from '../scylla-navigate.ts';

let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  navigator = installTestNavigator();
  contextStore.setState({ organization: { id: 'org-1', name: 'Acme Corp', slug: null } });
});

afterEach(() => navigator.restore());

describe('scyllaNavigate', () => {
  it('opens the page of a user in the active workspace', () => {
    scyllaNavigate.goToUser('user-2');

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/users/user-2', undefined);
  });

  it('opens the account of the session in the active workspace', () => {
    scyllaNavigate.goToAccount();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/account', undefined);
  });
});

describe('organizationUrl', () => {
  it('gives the projects of any workspace by default, from its slug', () => {
    expect(organizationUrl('beta-lab')).toBe('/beta-lab/projects');
  });

  it('gives another page of it on request', () => {
    expect(organizationUrl('beta-lab', 'account')).toBe('/beta-lab/account');
  });
});

describe('the prefix of the URLs', () => {
  it('uses the slug of the workspace, not its name', () => {
    contextStore.setState({ organization: { id: 'org-1', name: 'Acme Corp', slug: 'acme' } });
    scyllaNavigate.goToAccount();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/account', undefined);
  });
});
