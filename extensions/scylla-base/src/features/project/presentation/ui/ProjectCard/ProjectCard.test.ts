import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import {
  findFloating,
  render,
  withQueryClient,
  withRegistry,
  withWidgetInjections,
} from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { contextStore } from '@platform/context';
import { permissionsStore, PermissionScope } from '@platform/authz';
import { selectionStore } from '@scylla/ui/stores';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type {
  ProjectRepository,
} from '@base/features/project/domain/repository/project.repository.ts';
import { projectPoints } from '../../project.points.ts';
import ProjectCard from './ProjectCard.svelte';
import ProjectCardProbe from './ProjectCardProbe.fixture.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn() } }));

const project = (overrides: Partial<ProjectEntity> = {}): ProjectEntity => ({
  id: 'project-1',
  workspaceId: 'org-1',
  name: 'web',
  description: 'the web app',
  ...overrides,
});

let teardown: Array<() => void> = [];
let testNavigator: ReturnType<typeof installTestNavigator>;
let remove: ReturnType<typeof vi.fn>;

const renderCard = (entity: ProjectEntity = project(), batch?: string[]) => {
  remove = vi.fn().mockResolvedValue(undefined);
  const repository = {
    getByWorkspaceId: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue(entity),
    delete: remove,
  } as unknown as ProjectRepository;

  const cache = withQueryClient();
  const restoreRegistry = withRegistry({ project: { projectRepository: repository } });
  testNavigator = installTestNavigator({ pathname: '/acme/projects' });
  teardown = [cache.restore, restoreRegistry, testNavigator.restore];

  return render(ProjectCard, { project: entity, batch });
};

const openMenu = () => userEvent.click(screen.getByRole('button', { name: 'Project menu' }));

beforeEach(() => {
  selectionStore.setState({ selectedIds: {} });
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: null },
    project: { id: null, name: null },
  });
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
});

afterEach(() => teardown.forEach(restore => restore()));

describe('ProjectCard', () => {
  it('navigates to the project when clicked', async () => {
    renderCard();

    await userEvent.click(screen.getByText('web'));

    expect(testNavigator.navigate).toHaveBeenCalled();
  });

  it('shows the description', () => {
    renderCard(project({ description: 'a real one' }));
    expect(screen.getByText('a real one')).toBeInTheDocument();
  });

  it('shows an italic "No description" placeholder when there is none', () => {
    renderCard(project({ description: '' }));
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('has no menu without UPDATE_PROJECT and DELETE_PROJECT on this project', () => {
    permissionsStore.setState({ permissions: { scopes: [] } });
    renderCard();
    expect(screen.queryByRole('button', { name: 'Project menu' })).toBeNull();
  });

  it('opens the edit dialog from its menu, without navigating', async () => {
    renderCard();

    await openMenu();
    await userEvent.click(await findFloating('menuitem', 'Edit project'));

    expect(testNavigator.navigate).not.toHaveBeenCalled();
    expect(await screen.findByText('Update the project name and description.')).toBeInTheDocument();
  });

  it('deletes the project from its menu after a confirmation', async () => {
    renderCard();

    await openMenu();
    await userEvent.click(await findFloating('menuitem', 'Delete'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete the project “web”?');
    expect(remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(remove).toHaveBeenCalledWith('project-1');
    expect(testNavigator.navigate).not.toHaveBeenCalled();
  });

  it('gives its zones the project and its batch, and a link of a zone does not open the project', async () => {
    teardown.push(
      withWidgetInjections({
        Probe: [
          projectPoints.cardBody.inject({
            component: () => Promise.resolve({ default: ProjectCardProbe }),
          }),
        ],
      }),
    );
    renderCard(project(), ['project-1', 'project-2']);

    const link = await screen.findByRole('link', {
      name: 'Pipelines of web, batch of project-1 and project-2',
    });
    link.addEventListener('click', event => event.preventDefault());
    await userEvent.click(link);

    expect(testNavigator.navigate).not.toHaveBeenCalled();
  });

  it('checking the selection checkbox toggles selection without navigating', async () => {
    renderCard(project({ id: 'project-9' }));

    await userEvent.click(screen.getByRole('checkbox'));

    expect(testNavigator.navigate).not.toHaveBeenCalled();
    expect(selectionStore.getState().selectedIds.projects).toContain('project-9');
  });
});
