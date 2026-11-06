// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { msg } from '@lingui/core/macro';
import type { NavSectionDefinition, RoutePermission } from '@scylla/core-sdk';
import { testPermission } from '../../routing/__test__/test-permission.fixture.ts';
import type { NavEntry } from '../../routing/compilation/nav-entries.ts';
import { fillPath } from '../../routing/compilation/route-path.ts';
import { navSectionsFor, type NavSectionsInput } from './nav-sections.ts';

const LIST_SECRETS = testPermission('LIST_SECRETS');
const LIST_PIPELINES = testPermission('LIST_PIPELINES');
const LIST_USERS = testPermission('LIST_USERS');

const entry = (overrides: Partial<NavEntry> = {}): NavEntry => ({
  section: 'workspace',
  title: msg`Secrets`,
  mount: 'workspace',
  url: 'secrets',
  pattern: [':workspaceSlug', 'secrets'],
  permission: LIST_SECRETS,
  ...overrides,
});

const SECTIONS: readonly NavSectionDefinition[] = [
  { id: 'workspace', title: msg`Workspace` },
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
    hrefOf: ({ pattern }) => fillPath(pattern, { workspaceSlug: 'acme-corp' }),
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

  it('drops a section left empty', () => {
    const entries = [
      entry({ section: 'system', title: msg`Users`, url: 'users', permission: LIST_USERS }),
    ];

    expect(sectionsFor(entries, [])).toEqual([]);
  });

  it('keeps what says where a section goes in the rail', () => {
    const sections: NavSectionDefinition[] = [
      {
        id: 'workspace',
        title: msg`Workspace`,
        within: { railItem: 'parent', titleParam: 'name' },
      },
    ];
    const [section] = navSectionsFor({
      entries: [entry({ permission: undefined })],
      sections,
      hrefOf: () => '/acme/secrets',
      can: () => true,
      translate: message => message.message ?? '',
    });

    expect(section?.within).toEqual({ railItem: 'parent', titleParam: 'name' });
  });

  it('keeps the order in which the extensions declare the sections', () => {
    const entries = [
      entry({ section: 'system', title: msg`Users`, url: 'users', permission: LIST_USERS }),
      entry(),
    ];
    const sections = sectionsFor(entries, [LIST_USERS, LIST_SECRETS]);

    expect(sections.map(section => section.id)).toEqual(['workspace', 'system']);
  });

  it('opens an entry at its URL, and keeps its path in the mount for the extensions', () => {
    const [workspace] = sectionsFor([entry()], [LIST_SECRETS]);
    expect(workspace.items[0]).toMatchObject({ href: '/acme-corp/secrets', url: 'secrets' });
  });

  it('drops an entry whose URL the current parameters cannot fill', () => {
    const sections = sectionsFor([entry()], [LIST_SECRETS], { hrefOf: () => null });
    expect(titles(sections)).toEqual([]);
  });

  it('folds the links of one group under one item, at the place of its first link', () => {
    const group = { id: 'machines', title: msg`Machines` };
    const entries = [
      entry({ permission: undefined, title: msg`Dashboard`, url: 'dashboard' }),
      entry({ permission: undefined, title: msg`Agents`, url: 'agents', group }),
      entry({ permission: undefined, title: msg`Secrets`, url: 'secrets' }),
      entry({ permission: undefined, title: msg`Apps`, url: 'apps', group }),
    ];

    const [section] = sectionsFor(entries, []);

    expect(section?.items.map(node => node.title)).toEqual(['Dashboard', 'Machines', 'Secrets']);
    const machines = section?.items[1];
    expect(machines && 'items' in machines ? machines.items.map(item => item.title) : []).toEqual([
      'Agents',
      'Apps',
    ]);
  });

  it('translates the heading of a link', () => {
    const [section] = sectionsFor(
      [entry({ heading: msg`Quick filters`, permission: undefined })],
      [],
    );

    expect(section?.items[0]).toMatchObject({ heading: 'Quick filters' });
  });
});
