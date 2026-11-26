import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { contextStore } from '@platform/context';
import { permissionsStore, PermissionScope } from '@platform/authz';
import type { ProjectGroupEntity } from '@base/features/project/domain/entities/project-group.entity.ts';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type { ProjectGroupRepository } from '@base/features/project/domain/repository/project-group.repository.ts';
import type { ProjectRepository } from '@base/features/project/domain/repository/project.repository.ts';
import type {
  ProjectSearch,
  ProjectSearchResult,
} from '@base/features/project/domain/structs/project-search.struct.ts';
import { PROJECT_PINS_KEY, PROJECT_SECTIONS_KEY } from '../../project-layout.user-state.ts';
import ProjectList from '../ProjectList.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const project = (name: string, groupId?: string): ProjectEntity => ({
  id: `id-${name}`,
  workspaceId: 'org-1',
  name,
  description: '',
  ...(groupId && { groupId }),
});

/** "web" and "api" in the group "Deploys"; "docs", "cli" and "status" in no group. */
const ALL = [
  project('web', 'g-1'),
  project('api', 'g-1'),
  project('docs'),
  project('cli'),
  project('status'),
];
const DEPLOYS: ProjectGroupEntity = { id: 'g-1', workspaceId: 'org-1', name: 'Deploys' };

let teardown: Array<() => void> = [];
let search: ReturnType<typeof vi.fn<(input: ProjectSearch) => Promise<ProjectSearchResult>>>;
let groups: { [K in keyof ProjectGroupRepository]: ReturnType<typeof vi.fn> };

beforeEach(() => {
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: null },
    project: { id: null, name: null },
  });
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
  search = vi.fn(({ section, projectIds, limit }: ProjectSearch) => {
    const found = ALL.filter(
      item =>
        (!projectIds?.length || projectIds.includes(item.id)) &&
        (section?.kind !== 'group' || item.groupId === section.groupId) &&
        (section?.kind !== 'ungrouped' || !item.groupId),
    );
    const failed = section?.kind === 'group' ? 1 : 0;
    return Promise.resolve({
      items: found.slice(0, limit),
      counts: { total: found.length, failed, running: 0, pipelines: 0 },
      hasMore: found.length > limit,
    });
  });
  groups = {
    list: vi.fn(() => Promise.resolve([DEPLOYS])),
    create: vi.fn((_: string, name: string) =>
      Promise.resolve({ id: 'g-2', workspaceId: 'org-1', name }),
    ),
    rename: vi.fn(),
    reorder: vi.fn(),
    delete: vi.fn(),
    move: vi.fn(({ id }: { id: string }) => Promise.resolve(ALL.find(item => item.id === id))),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      project: {
        projectRepository: { search } as unknown as ProjectRepository,
        projectGroupRepository: groups as unknown as ProjectGroupRepository,
      },
    }),
    installTestNavigator({ pathname: '/acme/projects' }).restore,
  ];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  localStorage.clear();
});

const section = (name: string) => screen.getByRole('region', { name });
const cardsOf = (name: string) =>
  [...section(name).querySelectorAll('[data-tour="project-card"]')].map(card =>
    card.getAttribute('data-project-id'),
  );
const headerOf = (name: string, expanded = true) =>
  within(section(name)).getByRole('button', { expanded, name: new RegExp(`^${name}`) });

const openMenuOf = async (name: string, sectionName: string) => {
  const card = await waitFor(() => {
    const found = section(sectionName).querySelector(`[data-project-id="id-${name}"]`);
    expect(found).not.toBeNull();
    return found as HTMLElement;
  });
  await userEvent.click(within(card).getByRole('button', { name: 'Project menu' }));
};

describe('the sections of the projects page', () => {
  it('shows the pins, then the groups, then the projects with no group', async () => {
    localStorage.setItem(PROJECT_PINS_KEY, JSON.stringify({ 'org-1': ['id-cli'] }));
    render(ProjectList, { workspaceId: 'org-1' });

    await screen.findByRole('region', { name: 'Deploys' });
    await waitFor(() => expect(cardsOf('Pinned')).toEqual(['id-cli']));

    const names = screen.getAllByRole('region').map(region => region.getAttribute('aria-label'));
    expect(names).toEqual(['Pinned', 'Deploys', 'No group']);
    expect(cardsOf('Deploys')).toEqual(['id-web', 'id-api']);
    expect(cardsOf('No group')).toEqual(['id-docs', 'id-cli', 'id-status']);
    expect(headerOf('Deploys')).toHaveTextContent('Deploys 2 1 failing');
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ order: 'position', section: { kind: 'group', groupId: 'g-1' } }),
    );
  });

  it('closes a section, and keeps it closed on the next visit', async () => {
    const page = render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(headerOf('Deploys'));

    expect(cardsOf('Deploys')).toEqual([]);
    expect(JSON.parse(localStorage.getItem(PROJECT_SECTIONS_KEY)!)).toEqual({ 'org-1': ['g-1'] });

    page.unmount();
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });
    expect(headerOf('Deploys', false)).toBeInTheDocument();
  });

  it('pins a project from its menu, and unpins it', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });
    expect(screen.queryByRole('region', { name: 'Pinned' })).not.toBeInTheDocument();

    await openMenuOf('docs', 'No group');
    await userEvent.click(await findFloating('menuitem', 'Pin'));

    await waitFor(() => expect(cardsOf('Pinned')).toEqual(['id-docs']));
    expect(JSON.parse(localStorage.getItem(PROJECT_PINS_KEY)!)).toEqual({ 'org-1': ['id-docs'] });

    await openMenuOf('docs', 'Pinned');
    await userEvent.click(await findFloating('menuitem', 'Unpin'));

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Pinned' })).not.toBeInTheDocument(),
    );
  });

  it('moves a project to a group from its menu, last in the group', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await openMenuOf('docs', 'No group');
    await userEvent.click(await findFloating('menuitem', 'Move to group'));
    await userEvent.click(await findFloating('menuitem', 'Deploys'));

    await waitFor(() =>
      expect(groups.move).toHaveBeenCalledWith({ id: 'id-docs', groupId: 'g-1' }),
    );
  });

  it('moves a card up in its group, and not the first card', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await openMenuOf('api', 'Deploys');
    await userEvent.click(await findFloating('menuitem', 'Move up'));

    await waitFor(() =>
      expect(groups.move).toHaveBeenCalledWith({
        id: 'id-api',
        groupId: 'g-1',
        beforeId: 'id-web',
      }),
    );
    // The closed menu gives the pointer back to the page.
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'));
    await openMenuOf('web', 'Deploys');
    expect(await findFloating('menuitem', 'Move up')).toHaveAttribute('data-disabled');
  });

  it('enters the reorder mode, and Escape leaves it with no save', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(screen.getByRole('button', { name: 'Reorder' }));

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Project menu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New project' })).not.toBeInTheDocument();
    // The pins take a drop in the mode, also with no pin.
    expect(screen.getByRole('region', { name: 'Pinned' })).toHaveTextContent(
      'Drop a card here to pin it.',
    );

    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('searchbox', { name: 'Search the projects' })).toBeInTheDocument();
    expect(groups.move).not.toHaveBeenCalled();
  });

  it('gives no reorder mode out of the custom order', async () => {
    teardown.push(
      installTestNavigator({ pathname: '/acme/projects', search: '?sort=name' }).restore,
    );
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    const reorder = screen.getByRole('button', { name: 'Reorder' });
    expect(reorder).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(reorder);
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
  });

  it('creates a group from the header, after the other groups', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(screen.getByRole('button', { name: 'New group' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Group name' }), 'Releases{Enter}');

    await waitFor(() => expect(groups.create).toHaveBeenCalledWith('org-1', 'Releases'));
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Group name' })).not.toBeInTheDocument(),
    );
  });
});
