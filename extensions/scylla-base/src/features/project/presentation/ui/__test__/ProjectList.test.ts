import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { contextStore } from '@platform/context';
import { permissionsStore, PermissionScope } from '@platform/authz';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type { ProjectGroupRepository } from '@base/features/project/domain/repository/project-group.repository.ts';
import type { ProjectRepository } from '@base/features/project/domain/repository/project.repository.ts';
import type {
  ProjectSearch,
  ProjectSearchResult,
} from '@base/features/project/domain/structs/project-search.struct.ts';
import ProjectList from '../ProjectList.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const project = (name: string): ProjectEntity => ({
  id: `id-${name}`,
  workspaceId: 'org-1',
  name,
  description: '',
});

/** 43 projects: "web", "cloud-web", then "p-02" to "p-42". */
const ALL = [
  project('web'),
  project('cloud-web'),
  ...Array.from({ length: 41 }, (_, index) => project(`p-${String(index + 2).padStart(2, '0')}`)),
];

let teardown: Array<() => void> = [];
let search: ReturnType<typeof vi.fn<(input: ProjectSearch) => Promise<ProjectSearchResult>>>;
let navigator: ReturnType<typeof installTestNavigator>;
let groups: {
  list: ReturnType<typeof vi.fn<ProjectGroupRepository['list']>>;
  move: ReturnType<typeof vi.fn<ProjectGroupRepository['move']>>;
};

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
  search = vi.fn(({ query, limit }: ProjectSearch) => {
    const found = ALL.filter(item => item.name.includes(query));
    return Promise.resolve({
      items: found.slice(0, limit),
      counts: query
        ? { total: found.length, failed: 1, running: 0, pending: 0, pipelines: 3 }
        : { total: found.length, failed: 2, running: 1, pending: 4, pipelines: 63 },
      hasMore: found.length > limit,
    });
  });
  const repository = { search } as unknown as ProjectRepository;
  groups = {
    list: vi.fn(() => Promise.resolve([])),
    move: vi.fn(({ id }) => Promise.resolve(project(id.replace('id-', '')))),
  };
  const groupRepository = groups as unknown as ProjectGroupRepository;
  const cache = withQueryClient();
  navigator = installTestNavigator({ pathname: '/acme/projects' });
  teardown = [
    cache.restore,
    withRegistry({
      project: { projectRepository: repository, projectGroupRepository: groupRepository },
    }),
    navigator.restore,
  ];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  localStorage.clear();
});

const cards = () => document.querySelectorAll('[data-tour="project-card"]');

describe('ProjectList', () => {
  it('counts the workspace in its header, shows six cards, then twelve more', async () => {
    render(ProjectList, { workspaceId: 'org-1' });

    expect(await screen.findByText('63 pipelines · 2 failing · 1 running · 4 pending')).toBeInTheDocument();
    expect(await screen.findByText('6 of 43 projects')).toBeInTheDocument();
    expect(cards()).toHaveLength(6);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'org-1', query: '', order: 'position', limit: 6 }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Show 12 more' }));

    expect(await screen.findByText('18 of 43 projects')).toBeInTheDocument();
    expect(cards()).toHaveLength(18);
    expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 18 }));
  });

  it('searches after a pause with the text in the URL, and clears the search', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByText('6 of 43 projects');

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search the projects' }), 'web');

    expect(
      await screen.findByText('2 results for “web” · names, descriptions, repositories and pipelines'),
    ).toBeInTheDocument();
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ query: 'web', limit: 6 }));
    expect(search).not.toHaveBeenCalledWith(expect.objectContaining({ query: 'we' }));
    expect(navigator.navigate).toHaveBeenLastCalledWith('/acme/projects?q=web', { replace: true });
    // The header still counts the whole workspace.
    expect(screen.getByText('63 pipelines · 2 failing · 1 running · 4 pending')).toBeInTheDocument();
    expect(cards()).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Clear the search' }));

    expect(navigator.navigate).toHaveBeenLastCalledWith('/acme/projects', { replace: true });
    expect(await screen.findByText('6 of 43 projects')).toBeInTheDocument();
  });

  it('puts the focus in the search on "/", and Escape clears it', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByText('6 of 43 projects');
    const field = screen.getByRole('searchbox', { name: 'Search the projects' });

    await userEvent.keyboard('/');
    expect(field).toHaveFocus();
    await userEvent.keyboard('cloud{Escape}');

    expect(field).toHaveValue('');
    expect(field).toHaveFocus();
  });

  it('filters by health and sorts, with both in the URL', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByText('6 of 43 projects');

    await userEvent.click(screen.getByText('Failing'));

    expect(navigator.navigate).toHaveBeenLastCalledWith('/acme/projects?health=failed', {
      replace: true,
    });
    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ health: 'failed' })),
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Sort the projects' }));
    await userEvent.click(await findFloating('option', 'Last job'));

    expect(navigator.navigate).toHaveBeenLastCalledWith(
      '/acme/projects?health=failed&sort=last-job',
      { replace: true },
    );
    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith(
        expect.objectContaining({ health: 'failed', order: 'last-job' }),
      ),
    );
    expect(screen.getByRole('combobox', { name: 'Sort the projects' })).toHaveTextContent(
      'Sort: last job',
    );
  });

  it('says that no project matches a search, with a way to clear it', async () => {
    teardown.push(installTestNavigator({ pathname: '/acme/projects', search: '?q=terraform' }).restore);
    render(ProjectList, { workspaceId: 'org-1' });

    expect(await screen.findByText('No project found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No project matches “terraform”. The search reads the name, the description, the repository and the pipeline names.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear the search' })).toBeInTheDocument();
    expect(cards()).toHaveLength(0);
  });

  it('grows with its cards, so "Show more" scrolls above a floating button at the bottom right', async () => {
    render(ProjectList, { workspaceId: 'org-1' });

    const more = await screen.findByRole('button', { name: 'Show 12 more' });
    const page = document.querySelector('[data-tour="projects"]');
    expect(page).toContainElement(more);
    expect(page).toHaveClass('min-h-full', 'shrink-0', 'pb-20');
    expect(page).not.toHaveClass('h-full');
  });
});
