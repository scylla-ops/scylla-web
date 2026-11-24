import { describe, expect, it } from 'vitest';
import { msg } from '@lingui/core/macro';
import { testPermission } from '../../routing/__test__/test-permission.fixture.ts';
import { navLinksFor } from '../nav-links.ts';
import type { ShellConfig } from '../shell-config.ts';

const LIST_SECRETS = testPermission('LIST_SECRETS');
const keywords = msg`vault`;

const config = (overrides: Partial<ShellConfig> = {}): ShellConfig => ({
  sections: [
    { id: 'workspace', title: msg`Workspace` },
    { id: 'system', title: msg`System` },
  ],
  entries: [
    {
      section: 'system',
      title: msg`Users`,
      mount: 'instance',
      url: 'users',
      pattern: [':workspaceSlug', 'users'],
    },
    {
      section: 'workspace',
      title: msg`Secrets`,
      keywords,
      group: { id: 'tools', title: msg`Tools` },
      mount: 'workspace',
      url: 'secrets',
      pattern: [':workspaceSlug', 'secrets'],
      permission: LIST_SECRETS,
    },
    {
      section: 'workspace',
      title: msg`Jobs`,
      mount: 'workspace',
      url: 'jobs',
      pattern: [':missing', 'jobs'],
    },
  ],
  contributions: [{ linkParams: () => ({ workspaceSlug: 'acme' }) }],
  ...overrides,
});

describe('navLinksFor', () => {
  it('gives the links in the order of the sections, with their words', () => {
    const links = navLinksFor(config())();

    expect(links.map(link => link.href)).toEqual(['/acme/secrets', '/acme/users']);
    expect(links[0]).toMatchObject({
      url: 'secrets',
      keywords,
      section: { id: 'workspace' },
    });
    expect(links[0].group?.id).toBe(msg`Tools`.id);
  });

  it('leaves out a link that stays in the sidebar', () => {
    const [users, secrets] = config().entries;
    const links = navLinksFor(config({ entries: [{ ...users, inCommandBar: false }, secrets] }))();

    expect(links.map(link => link.url)).toEqual(['secrets']);
  });

  it('hides a link that the user cannot open', () => {
    const links = navLinksFor(
      config({
        access: { can: () => false, ready: () => true, guard: undefined as never },
      }),
    )();

    expect(links.map(link => link.url)).toEqual(['users']);
  });
});
