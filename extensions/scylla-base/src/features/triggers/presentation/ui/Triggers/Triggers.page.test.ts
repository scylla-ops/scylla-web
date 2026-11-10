import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { selectionStore } from '@scylla/ui/stores';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type {
  TriggersRepository,
} from '@base/features/triggers/domain/repository/triggers.repository.ts';
import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';
import TriggersPage from './Triggers.page.svelte';

const trigger = (overrides: Partial<TriggerEntity> = {}): TriggerEntity => ({
  id: 'trigger-1',
  pipelineId: 'pipeline-1',
  name: 'nightly',
  source: { kind: 'cron', expression: '0 9 * * *' },
  inputs: [],
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

let listByPipelineId: ReturnType<typeof vi.fn>;
let navigator: ReturnType<typeof installTestNavigator>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

const props = { pipelineId: 'pipeline-1', projectId: 'project-1' };

beforeEach(() => {
  listByPipelineId = vi.fn().mockResolvedValue([trigger()]);
  navigator = installTestNavigator({
    pathname: '/acme/projects/project-1/pipelines/pipeline-1/triggers',
  });

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    triggers: {
      triggersRepository: {
        listByPipelineId,
        create: vi.fn(),
        update: vi.fn(),
        deleteById: vi.fn(),
        setEnabled: vi.fn(),
        fireNow: vi.fn(),
        getById: vi.fn(),
      } as unknown as TriggersRepository,
    },
  });

  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: null },
    project: { id: 'project-1', name: 'Web' },
    pipeline: { id: 'pipeline-1', name: 'build' },
  });
  selectionStore.setState({ selectedIds: {} });
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
});

afterEach(() => {
  navigator.restore();
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

describe('TriggersPage', () => {
  it("lists the pipeline's triggers", async () => {
    render(TriggersPage, props);

    expect(await screen.findByText('nightly')).toBeInTheDocument();
    expect(listByPipelineId).toHaveBeenCalledWith('pipeline-1');
  });

  it('grows with its table, so the last row scrolls above a floating button at the bottom right', async () => {
    render(TriggersPage, props);

    await screen.findByText('nightly');

    expect(document.querySelector('[data-tour="triggers"]')).toHaveClass('shrink-0', 'pb-20');
  });

  it('opens the jobs of the pipeline after a fire', async () => {
    render(TriggersPage, props);
    await screen.findByText('nightly');

    await userEvent.click(screen.getByRole('button', { name: 'Fire now' }));

    await vi.waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith(
        '/acme/projects/project-1/pipelines/pipeline-1/jobs',
        undefined,
      ),
    );
  });

  it('stays on the triggers after a fire when the user may not list the jobs', async () => {
    const fireNow = vi.fn().mockResolvedValue('job-1');
    restoreRegistry();
    restoreRegistry = withRegistry({
      triggers: {
        triggersRepository: { listByPipelineId, fireNow } as unknown as TriggersRepository,
      },
    });
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.SYSTEM,
            scopeId: '',
            access: { kind: 'restricted', permissions: [Permission.MANAGE_TRIGGERS] },
          },
        ],
      },
    });
    render(TriggersPage, props);
    await screen.findByText('nightly');

    await userEvent.click(screen.getByRole('button', { name: 'Fire now' }));

    await vi.waitFor(() => expect(fireNow).toHaveBeenCalledWith('trigger-1'));
    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: 'Fire now' })).not.toHaveAttribute('aria-busy'),
    );
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('summarises the triggers above the table', async () => {
    render(TriggersPage, props);

    expect(await screen.findByText('1/1')).toBeInTheDocument();
  });

  it('explains an empty pipeline instead of showing a bare table', async () => {
    listByPipelineId.mockResolvedValue([]);
    render(TriggersPage, props);

    expect(await screen.findByText('No triggers yet')).toBeInTheDocument();
    expect(screen.queryByText('0/0')).not.toBeInTheDocument();
  });

  it('refuses to render without the route parameters it needs', () => {
    render(TriggersPage, {});

    expect(screen.getByText('Pipeline ID is missing')).toBeInTheDocument();
    expect(listByPipelineId).not.toHaveBeenCalled();
  });

  it("surfaces the backend's own message when the list fails", async () => {
    const error = new ScyllaError('nope', { code: 'PERMISSION_DENIED' });
    listByPipelineId.mockRejectedValue(error);
    render(TriggersPage, props);

    expect(await screen.findByText(error.userMessage())).toBeInTheDocument();
  });

  it('opens the editor page to create a trigger', async () => {
    render(TriggersPage, props);
    await screen.findByText('nightly');

    await userEvent.click(screen.getByRole('button', { name: 'New trigger' }));

    expect(navigator.navigate).toHaveBeenCalledWith(
      '/acme/projects/project-1/pipelines/pipeline-1/triggers/new',
      undefined,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the editor page of a trigger from its edit action', async () => {
    render(TriggersPage, props);
    await screen.findByText('nightly');

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(navigator.navigate).toHaveBeenCalledWith(
      '/acme/projects/project-1/pipelines/pipeline-1/triggers/trigger-1/edit',
      undefined,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
