import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { contextStore } from '@platform/context';
import { permissionsStore, PermissionScope } from '@platform/authz';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type {
  ProjectRepository,
} from '@base/features/project/domain/repository/project.repository.ts';
import ProjectList from '../ProjectList.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const project = (id: string): ProjectEntity => ({
  id,
  workspaceId: 'org-1',
  name: id,
  description: '',
});

let teardown: Array<() => void> = [];

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
  const repository = {
    getByWorkspaceId: vi.fn().mockResolvedValue({
      items: [project('web'), project('api')],
      pagination: {
        totalCount: 30,
        page: 1,
        pageSize: 2,
        totalPages: 15,
        hasNext: true,
        hasPrevious: false,
      },
    }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as ProjectRepository;
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/acme/projects' });
  teardown = [
    cache.restore,
    withRegistry({ project: { projectRepository: repository } }),
    navigator.restore,
  ];
});

afterEach(() => teardown.forEach(restore => restore()));

describe('ProjectList', () => {
  it('grows with its cards, so the pagination scrolls above a floating button at the bottom right', async () => {
    render(ProjectList, { workspaceId: 'org-1' });

    const pagination = await screen.findByRole('navigation', { name: 'Pagination' });
    const page = document.querySelector('[data-tour="projects"]');
    expect(page).toContainElement(pagination);
    expect(page).toHaveClass('min-h-full', 'shrink-0', 'pb-20');
    expect(page).not.toHaveClass('h-full');
  });
});
