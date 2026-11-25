import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { findFloating, focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import type { TriggersRepository } from '@base/features/triggers/domain/repository/triggers.repository.ts';
import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';
import { convertCronToUTC } from '@base/features/triggers/presentation/mappers/cron-timezone.mapper.ts';
import PipelineTriggersPanel from './PipelineTriggersPanel.svelte';

const trigger = (overrides: Partial<TriggerEntity> = {}): TriggerEntity => ({
  id: 'trigger-1',
  pipelineId: 'pipeline-1',
  name: 'nightly',
  source: { kind: 'cron', expression: convertCronToUTC('0 9 * * *') },
  inputs: [],
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  fromFile: false,
  ...overrides,
});

const push = trigger({
  id: 'push',
  name: 'push',
  source: { kind: 'push', branches: ['main'], excludeBranches: [], skipCi: true },
  fromFile: true,
});

const LIST_PATH = '/acme/projects/project-1/pipelines/pipeline-1/triggers';

let listByPipelineId: ReturnType<typeof vi.fn>;
let create: ReturnType<typeof vi.fn>;
let setEnabled: ReturnType<typeof vi.fn>;
let deleteById: ReturnType<typeof vi.fn>;
let navigator: ReturnType<typeof installTestNavigator>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

const setUp = (source: 'editor' | 'file', triggers: TriggerEntity[]) => {
  listByPipelineId = vi.fn().mockResolvedValue(triggers);
  restoreRegistry = withRegistry({
    triggers: {
      triggersRepository: {
        listByPipelineId,
        create,
        setEnabled,
        deleteById,
      } as unknown as TriggersRepository,
    },
    integrations: {
      repositoryLinkRepository: {
        getByProject: () =>
          Promise.resolve({ projectId: 'project-1', provider: 'github', fullName: 'acme/api' }),
      },
    },
    pipeline: {
      pipelineRepository: {
        getWithLayout: () =>
          Promise.resolve({
            pipeline: { id: 'pipeline-1', name: 'build', nodes: [] },
            layout: null,
            origin: { source, filePath: '.scylla/pipelines/build.yaml', fileErrorCount: 0 },
          }),
      },
    },
  });
  // `context` is also a mount option of Svelte: the props go in `props`.
  render(PipelineTriggersPanel, {
    props: { context: { pipelineId: 'pipeline-1', projectId: 'project-1' } },
  });
};

beforeEach(() => {
  create = vi.fn().mockResolvedValue({ trigger: trigger({ id: 'new', name: 'Schedule' }) });
  setEnabled = vi.fn().mockResolvedValue(trigger({ enabled: false }));
  deleteById = vi.fn().mockResolvedValue(undefined);
  navigator = installTestNavigator({ pathname: '/acme/projects/project-1/edit/pipeline-1' });
  cache = withQueryClient();
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: 'acme' },
    project: { id: 'project-1', name: 'Web' },
    pipeline: { id: 'pipeline-1', name: 'build' },
  });
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

const rowOf = (name: string) => screen.getByText(name, { selector: 'span' }).closest('li')!;

describe('PipelineTriggersPanel', () => {
  it('shows the triggers of the file read only, apart from the ones that Scylla keeps', async () => {
    setUp('file', [push, trigger()]);

    expect(await screen.findByRole('heading', { name: 'Stored in Scylla' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'From the file' })).toBeInTheDocument();
    const fileRow = rowOf('push');
    expect(within(fileRow).getByText('Push · main')).toBeInTheDocument();
    expect(within(fileRow).queryByRole('switch')).not.toBeInTheDocument();
    expect(
      within(fileRow).getByRole('button', {
        name: 'This trigger comes from the pipeline file. Change the file to change it.',
      }),
    ).toBeInTheDocument();
    const storedRow = rowOf('nightly');
    expect(within(storedRow).getByText('Every day at 09:00')).toBeInTheDocument();
    expect(within(storedRow).getByText('Never fired')).toBeInTheDocument();
    expect(within(storedRow).getByRole('switch', { name: 'Enable nightly' })).toBeChecked();
  });

  it('shows the triggers of an editor pipeline with no group, and says when it has none', async () => {
    setUp('editor', []);

    expect(
      await screen.findByText('No trigger yet. Only a manual run starts this pipeline.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('stops a trigger with its switch, and keeps it', async () => {
    setUp('editor', [trigger()]);

    await userEvent.click(await screen.findByRole('switch', { name: 'Enable nightly' }));

    await vi.waitFor(() => expect(setEnabled).toHaveBeenCalledWith('trigger-1', false));
    expect(deleteById).not.toHaveBeenCalled();
  });

  it('deletes a trigger only after a confirmation', async () => {
    setUp('editor', [trigger()]);

    await userEvent.click(await screen.findByRole('button', { name: 'Trigger actions' }));
    await userEvent.click(await findFloating('menuitem', 'Delete'));
    expect(deleteById).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));

    await vi.waitFor(() => expect(deleteById).toHaveBeenCalledWith('trigger-1'));
  });

  it('edits a trigger in the full editor', async () => {
    setUp('editor', [trigger()]);

    await userEvent.click(await screen.findByRole('button', { name: 'Trigger actions' }));
    await userEvent.click(await findFloating('menuitem', 'Edit'));

    expect(navigator.navigate).toHaveBeenCalledWith(`${LIST_PATH}/trigger-1/edit`, undefined);
  });

  it('creates a schedule in the panel, with a name that no trigger has', async () => {
    setUp('editor', [trigger({ name: 'Schedule' })]);

    await userEvent.click(await screen.findByRole('button', { name: 'Add trigger' }));
    await userEvent.click(await findFloating('menuitem', 'Schedule'));
    const form = await screen.findByRole('form', { name: 'New schedule' });
    await focusSettled();
    expect(within(form).getByLabelText('Name')).toHaveValue('Schedule 2');
    await userEvent.click(within(form).getByRole('button', { name: 'Create' }));

    await vi.waitFor(() =>
      expect(create).toHaveBeenCalledWith('pipeline-1', {
        name: 'Schedule 2',
        source: { kind: 'cron', expression: convertCronToUTC('0 9 * * *') },
        inputs: [],
      }),
    );
    await vi.waitFor(() =>
      expect(screen.queryByRole('form', { name: 'New schedule' })).not.toBeInTheDocument(),
    );
  });

  it('offers only a schedule and a webhook on a file pipeline, and opens the full editor for a webhook', async () => {
    setUp('file', [push]);
    await screen.findByRole('heading', { name: 'From the file' });

    await userEvent.click(screen.getByRole('button', { name: 'Add trigger' }));
    const items = await screen.findAllByRole('menuitem', { hidden: true });
    expect(items.map(item => item.textContent?.trim())).toEqual(['Schedule', 'Webhook']);
    await userEvent.click(await findFloating('menuitem', 'Webhook'));

    expect(navigator.navigate).toHaveBeenCalledWith(`${LIST_PATH}/new?kind=webhook`, undefined);
  });

  it('offers the Git kinds on an editor pipeline of a linked project', async () => {
    setUp('editor', []);
    await screen.findByText('No trigger yet. Only a manual run starts this pipeline.');

    await userEvent.click(screen.getByRole('button', { name: 'Add trigger' }));
    const items = await screen.findAllByRole('menuitem', { hidden: true });

    expect(items.map(item => item.textContent?.trim())).toEqual([
      'Schedule',
      'Webhook',
      'Push',
      'Pull request',
      'Tag',
    ]);
  });
});
