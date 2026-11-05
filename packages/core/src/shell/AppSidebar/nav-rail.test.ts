import { describe, expect, it } from 'vitest';
import type { NavItem, NavSection } from '../structs/nav-section.struct.ts';
import { activePageOf, railFor, secondSidebarFor, selectedRailItem } from './nav-rail.ts';

const page = (url: string, href = `/acme/${url}`): NavItem => ({ title: url, href, url });

const sections: NavSection[] = [
  {
    id: 'main',
    title: 'Main',
    items: [
      page('dashboard'),
      { id: 'machines', title: 'Machines', items: [page('agents'), page('apps')] },
    ],
  },
  {
    id: 'inner',
    title: 'Inner',
    within: { railItem: 'projects', titleParam: 'projectName' },
    items: [page('', '/acme/projects/1'), page('secrets', '/acme/projects/1/secrets')],
  },
  {
    id: 'instance',
    title: 'Instance',
    railItem: {},
    items: [page('users', '/acme/instance/users')],
  },
];

describe('railFor', () => {
  it('makes one item of each link and each group, in order', () => {
    expect(railFor(sections).main.map(item => item.id)).toEqual(['dashboard', 'machines']);
  });

  it('keeps the pages of a group on its item, and names the group', () => {
    const machines = railFor(sections).main[1];

    expect(machines?.pages.map(item => item.url)).toEqual(['agents', 'apps']);
    expect(machines?.group).toBe('machines');
  });

  it('makes one item at the end of a section with railItem', () => {
    const { end } = railFor(sections);

    expect(end.map(item => item.id)).toEqual(['instance']);
    expect(end[0]?.pages.map(item => item.url)).toEqual(['users']);
  });

  it('gives no item to a section that shows within another item', () => {
    const { main, end } = railFor(sections);

    expect([...main, ...end].map(item => item.id)).not.toContain('inner');
  });
});

describe('activePageOf', () => {
  it('takes the longest match, because a parent URL is a prefix of its children', () => {
    const pages = [page('', '/acme/projects/1'), page('secrets', '/acme/projects/1/secrets')];

    expect(activePageOf(pages, '/acme/projects/1/secrets')?.url).toBe('secrets');
    expect(activePageOf(pages, '/acme/projects/1/create')?.url).toBe('');
  });

  it('finds nothing for a URL of another section', () => {
    expect(activePageOf([page('agents')], '/acme/apps')).toBeUndefined();
  });
});

describe('selectedRailItem', () => {
  it('selects the item that has the page of the URL', () => {
    expect(selectedRailItem(railFor(sections), '/acme/apps/1')?.id).toBe('machines');
    expect(selectedRailItem(railFor(sections), '/acme/instance/users')?.id).toBe('instance');
  });

  it('selects nothing for a URL with no page', () => {
    expect(selectedRailItem(railFor(sections), '/acme/account')).toBeUndefined();
  });
});

describe('secondSidebarFor', () => {
  const projects = { id: 'projects', title: 'Projects', pages: [page('projects')] };

  it('shows the pages of the rail item', () => {
    const content = secondSidebarFor(projects, [], {});

    expect(content).toEqual({ id: 'projects', title: 'Projects', pages: projects.pages });
  });

  it('shows the section within the item, with the name from the parameters', () => {
    const content = secondSidebarFor(projects, sections, { projectName: 'api' });

    expect(content.id).toBe('inner');
    expect(content.title).toBe('api');
    expect(content.pages.map(item => item.url)).toEqual(['', 'secrets']);
  });

  it('uses the title of the section until the name is known', () => {
    expect(secondSidebarFor(projects, sections, {}).title).toBe('Inner');
  });
});
