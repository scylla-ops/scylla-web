// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { Component } from 'svelte';
import { msg } from '@lingui/core/macro';
import type { NavSectionDefinition, RoutePermission } from '@scylla/core-sdk';
import { testPermission } from '../../routing/__test__/test-permission.fixture.ts';
import type { NavEntry } from '../../routing/compilation/nav-entries.ts';
import { fillPath } from '../../routing/compilation/route-path.ts';
import { navSectionsFor, type NavSectionsInput } from '../nav-sections.ts';

const LIST_SECRETS = testPermission('LIST_SECRETS');
const LIST_PIPELINES = testPermission('LIST_PIPELINES');
const LIST_USERS = testPermission('LIST_USERS');

const entry = (overrides: Partial<NavEntry> = {}): NavEntry => ({
  section: 'organization',
  title: msg`Secrets`,
  mount: 'organization',
  url: 'secrets',
  pattern: [':organizationSlug', 'secrets'],
  permission: LIST_SECRETS,
  ...overrides,
});

const header = {} as Component;

const SECTIONS: readonly NavSectionDefinition[] = [
  { id: 'organization', title: msg`Organization`, header },
  { id: 'system', title: msg`System` },
];

const sectionsFor = (
  entries: readonly NavEntry[],
  held: readonly RoutePermission[],
  overrides: Partial<NavSectionsInput> = {},
) =>
  navSectionsFor({
    entries,
    sections: SECTIONS,
    hrefOf: ({ pattern }) => fillPath(pattern, { organizationSlug: 'acme-corp' }),
    can: permission => held.includes(permission),
    translate: message => message.message ?? message.id,
    ...overrides,
  });

const titles = (sections: ReturnType<typeof sectionsFor>) =>
  sections.flatMap(section => section.items.map(item => item.title));

describe('navSectionsFor', () => {
  it('keeps an entry whose permission the user holds', () => {
    expect(titles(sectionsFor([entry()], [LIST_SECRETS]))).toEqual(['Secrets']);
  });

  it('removes an entry whose permission the user lacks', () => {
    expect(titles(sectionsFor([entry()], [LIST_PIPELINES]))).toEqual([]);
  });

  it('always keeps an entry that declares no permission', () => {
    const entries = [entry({ permission: undefined, title: msg`Dashboard`, url: 'dashboard' })];
    expect(titles(sectionsFor(entries, []))).toEqual(['Dashboard']);
  });

  it('filters per entry, not per section', () => {
    const entries = [
      entry(),
      entry({ title: msg`Pipelines`, url: 'pipelines', permission: LIST_PIPELINES }),
    ];
    expect(titles(sectionsFor(entries, [LIST_SECRETS]))).toEqual(['Secrets']);
  });

  it('drops a section left empty, but keeps a section that has a header', () => {
    const entries = [entry(), entry({ section: 'system', title: msg`Users`, url: 'users' })];
    const sections = sectionsFor(entries, []);

    expect(sections.map(section => section.title)).toEqual(['Organization']);
    expect(sections[0].header).toBe(header);
  });

  it('keeps the order in which the extensions declare the sections', () => {
    const entries = [
      entry({ section: 'system', title: msg`Users`, url: 'users', permission: LIST_USERS }),
      entry(),
    ];
    const sections = sectionsFor(entries, [LIST_USERS, LIST_SECRETS]);

    expect(sections.map(section => section.id)).toEqual(['organization', 'system']);
  });

  it('opens an entry at its URL, and keeps its path in the mount for the extensions', () => {
    const [organization] = sectionsFor([entry()], [LIST_SECRETS]);
    expect(organization.items[0]).toMatchObject({ href: '/acme-corp/secrets', url: 'secrets' });
  });

  it('drops an entry whose URL the current parameters cannot fill', () => {
    const sections = sectionsFor([entry()], [LIST_SECRETS], { hrefOf: () => null });
    expect(titles(sections)).toEqual([]);
  });
});
