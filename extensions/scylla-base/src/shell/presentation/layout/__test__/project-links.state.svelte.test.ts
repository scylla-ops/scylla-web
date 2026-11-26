import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { ProjectEntity, ProjectGroupEntity } from '@base/features/project';
import { withQueryClient, withRegistry } from '@test/render.ts';
import { projectLinks } from '../project-links.state.svelte.ts';

const project = (id: string, name: string, groupId?: string): ProjectEntity => ({
  id,
  workspaceId: 'org-1',
  name,
  ...(groupId && { groupId }),
});
const group = (id: string, name: string, color?: string): ProjectGroupEntity => ({
  id,
  workspaceId: 'org-1',
  name,
  ...(color && { color }),
});

const PINS_KEY = 'scylla.project-pins';
const SECTIONS_KEY = 'scylla.project-sections';

const resultOf = (items: ProjectEntity[]) => ({
  items,
  counts: { total: items.length, failed: 0, running: 0, pipelines: 0 },
  hasMore: false,
});

const repository = { search: vi.fn() };
const groups = { list: vi.fn() };
let running: ProjectEntity[];
let all: ProjectEntity[];

let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let cleanups: (() => void)[];

const grantProjectList = () =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'org-1',
          access: { kind: 'restricted', permissions: [Permission.LIST_PROJECTS_BY_WORKSPACE] },
        },
      ],
    },
  });

const mount = (shown: string | undefined) => {
  let links!: ReturnType<typeof projectLinks>;
  cleanups.push(
    $effect.root(() => {
      links = projectLinks(() => shown);
    }),
  );
  flushSync();
  return links;
};

const titles = (links: ReturnType<typeof projectLinks>) =>
  links().map(link => `${link.section?.title ?? '-'}/${link.title}`);

beforeEach(() => {
  cache = withQueryClient();
  cleanups = [];
  localStorage.clear();
  all = [project('p-1', 'feu'), project('p-2', 'td')];
  running = [];
  repository.search
    .mockReset()
    .mockImplementation(({ health }: { health: string }) =>
      Promise.resolve(resultOf(health === 'running' ? running : all)),
    );
  groups.list.mockReset().mockResolvedValue([]);
  restoreRegistry = withRegistry({
    project: { projectRepository: repository, projectGroupRepository: groups },
  });
  grantProjectList();
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme Corp', slug: 'acme' },
    project: { id: null, name: null },
  });
});

afterEach(() => {
  cleanups.forEach(cleanup => cleanup());
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
  localStorage.clear();
});

describe('projectLinks', () => {
  it('gives one list in the order of the projects page, with no pin and no group', async () => {
    const links = mount('projects');

    await vi.waitFor(() =>
      expect(links().map(({ title, href, section }) => ({ title, href, section }))).toEqual([
        { title: 'feu', href: '/acme/projects/p-1', section: undefined },
        { title: 'td', href: '/acme/projects/p-2', section: undefined },
      ]),
    );
    expect(repository.search).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'org-1', order: 'position', health: 'all' }),
    );
  });

  it('gives each link the icon of its project', async () => {
    all = [
      { ...project('p-1', 'feu'), icon: { kind: 'glyph', name: 'rocket', color: 'chart-2' } },
      project('p-2', 'td'),
    ];
    const links = mount('projects');

    await vi.waitFor(() => expect(links()).toHaveLength(2));
    expect(links()[0]?.entityIcon).toMatchObject({ color: 'chart-2' });
    expect(links()[1]?.entityIcon).toMatchObject({ color: 'primary' });
  });

  it('shows the pins, then each group with its folder color, then the projects with no group', async () => {
    all = [
      project('p-3', 'api', 'g-2'),
      project('p-1', 'web', 'g-1'),
      project('p-2', 'docs', 'g-1'),
      project('p-4', 'cli'),
    ];
    groups.list.mockResolvedValue([group('g-2', 'Backend', '#e879f9'), group('g-1', 'Deploys')]);
    localStorage.setItem(PINS_KEY, JSON.stringify({ 'org-1': ['p-4'] }));
    const links = mount('projects');

    await vi.waitFor(() =>
      expect(titles(links)).toEqual([
        'Pinned/cli',
        'Backend/api',
        'Deploys/web',
        'Deploys/docs',
        'No group/cli',
      ]),
    );
    expect(links()[1]?.section).toMatchObject({ key: 'g-2', color: '#e879f9', folded: false });
    expect(links()[2]?.section?.color).toBeUndefined();
  });

  it('gives each group and « No group » a "+" for a new project there, and none to the pins', async () => {
    all = [project('p-1', 'web', 'g-1'), project('p-2', 'cli')];
    groups.list.mockResolvedValue([group('g-1', 'Deploys')]);
    localStorage.setItem(PINS_KEY, JSON.stringify({ 'org-1': ['p-2'] }));
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.WORKSPACE,
            scopeId: 'org-1',
            access: {
              kind: 'restricted',
              permissions: [Permission.LIST_PROJECTS_BY_WORKSPACE, Permission.CREATE_PROJECT],
            },
          },
        ],
      },
    });
    const links = mount('projects');

    await vi.waitFor(() => expect(links()).toHaveLength(3));
    expect(links().map(link => link.section?.action)).toEqual([
      undefined,
      { label: 'New project in Deploys', href: '/acme/projects/new?group=g-1' },
      { label: 'New project with no group', href: '/acme/projects/new' },
    ]);
  });

  it('gives no "+" to a person who cannot create a project', async () => {
    all = [project('p-1', 'web', 'g-1'), project('p-2', 'cli')];
    groups.list.mockResolvedValue([group('g-1', 'Deploys')]);
    const links = mount('projects');

    await vi.waitFor(() => expect(links()).toHaveLength(2));
    expect(links().map(link => link.section?.action)).toEqual([undefined, undefined]);
  });

  it('folds a section as the projects page does, in the same key', async () => {
    all = [project('p-1', 'web', 'g-1'), project('p-2', 'cli')];
    groups.list.mockResolvedValue([group('g-1', 'Deploys')]);
    localStorage.setItem(SECTIONS_KEY, JSON.stringify({ 'org-1': ['ungrouped'] }));
    const links = mount('projects');

    await vi.waitFor(() => expect(links()).toHaveLength(2));
    expect(links()[1]?.section).toMatchObject({ key: 'ungrouped', folded: true });

    links()[0]?.section?.onToggle(true);
    flushSync();

    expect(JSON.parse(localStorage.getItem(SECTIONS_KEY)!)).toEqual({
      'org-1': ['ungrouped', 'g-1'],
    });
    expect(links()[0]?.section?.folded).toBe(true);
  });

  it('marks a project with a job that runs', async () => {
    running = [project('p-2', 'td')];
    const links = mount('projects');

    await vi.waitFor(() => expect(links()[1]?.status).toEqual({ tone: 'running', label: 'A job runs' }));
    expect(links()[0]?.status).toBeUndefined();
    expect(repository.search).toHaveBeenCalledWith(expect.objectContaining({ health: 'running' }));
  });

  it('reads nothing while another item shows', async () => {
    const links = mount('dashboard');
    await new Promise(resolve => setTimeout(resolve));

    expect(links()).toEqual([]);
    expect(repository.search).not.toHaveBeenCalled();
    expect(groups.list).not.toHaveBeenCalled();
  });

  it('reads nothing without the permission to list the projects', async () => {
    permissionsStore.setState({ permissions: { scopes: [] } });
    const links = mount('projects');
    await new Promise(resolve => setTimeout(resolve));

    expect(links()).toEqual([]);
    expect(repository.search).not.toHaveBeenCalled();
  });
});
