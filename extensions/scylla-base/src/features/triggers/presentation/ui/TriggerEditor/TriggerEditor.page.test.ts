import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import {
  findFloating,
  focusSettled,
  render,
  withQueryClient,
  withRegistry,
} from '@test/render.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { TriggersRepository } from '@base/features/triggers/domain/repository/triggers.repository.ts';
import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';
import { TriggerKind } from '@base/features/triggers/domain/entities/trigger.entity.ts';
import TriggerEditorPage from './TriggerEditor.page.svelte';

const trigger = (overrides: Partial<TriggerEntity> = {}): TriggerEntity => ({
  id: 'trigger-1',
  pipelineId: 'pipeline-1',
  name: 'nightly',
  source: { kind: TriggerKind.Cron, expression: '0 9 * * *' },
  inputs: [],
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const LIST_PATH = '/acme/projects/project-1/pipelines/pipeline-1/triggers';

let listByPipelineId: ReturnType<typeof vi.fn>;
let create: ReturnType<typeof vi.fn>;
let update: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  listByPipelineId = vi.fn().mockResolvedValue(ScyllaResult.success([trigger()]));
  create = vi.fn().mockResolvedValue(ScyllaResult.success({ trigger: trigger() }));
  update = vi.fn().mockResolvedValue(ScyllaResult.success(trigger()));

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    triggers: {
      triggersRepository: { listByPipelineId, create, update } as unknown as TriggersRepository,
    },
  });
  navigator = installTestNavigator({ pathname: `${LIST_PATH}/new` });
  contextStore.setState({
    organization: { id: 'org-1', name: 'Acme' },
    project: { id: 'project-1', name: 'Web' },
    pipeline: { id: 'pipeline-1', name: 'build' },
  });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  navigator.restore();
});

const props = (overrides: Record<string, unknown> = {}) => ({
  pipelineId: 'pipeline-1',
  projectId: 'project-1',
  ...overrides,
});

const submitButton = (name: 'Create' | 'Save') => screen.getByRole('button', { name });

describe('TriggerEditorPage — create mode', () => {
  it('lays the form out as titled sections on a page, not in a dialog', async () => {
    render(TriggerEditorPage, props());

    expect(await screen.findByRole('heading', { level: 1, name: 'New trigger' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Schedule' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Inputs' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(listByPipelineId).not.toHaveBeenCalled();
  });

  it('refuses to submit without a name', () => {
    render(TriggerEditorPage, props());
    expect(submitButton('Create')).toBeDisabled();
  });

  it('refuses to render without the route parameters it needs', () => {
    render(TriggerEditorPage, {});

    expect(screen.getByText('Pipeline ID is missing')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('creates a cron trigger with the name and schedule that were entered, then goes back to the list', async () => {
    render(TriggerEditorPage, props());
    await focusSettled();

    await userEvent.type(screen.getByLabelText('Name'), 'nightly-build');
    await vi.waitFor(() => expect(submitButton('Create')).toBeEnabled());
    await userEvent.click(submitButton('Create'));

    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    const [pipelineId, draft] = create.mock.calls[0];
    expect(pipelineId).toBe('pipeline-1');
    expect(draft.name).toBe('nightly-build');
    expect(draft.source.kind).toBe(TriggerKind.Cron);
    await vi.waitFor(() => expect(navigator.navigate).toHaveBeenCalledWith(LIST_PATH, undefined));
  });

  it('reveals a webhook secret once, and goes back to the list when it is closed', async () => {
    create.mockResolvedValue(
      ScyllaResult.success({ trigger: trigger({ name: 'hook' }), webhookSecret: 'whsec-once' }),
    );
    render(TriggerEditorPage, props());
    await focusSettled();

    await userEvent.type(screen.getByLabelText('Name'), 'hook');
    await userEvent.click(submitButton('Create'));

    expect(await screen.findByText('whsec-once')).toBeInTheDocument();
    expect(navigator.navigate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('button', { name: /done/i }));

    await vi.waitFor(() => expect(navigator.navigate).toHaveBeenCalledWith(LIST_PATH, undefined));
    expect(screen.queryByText('whsec-once')).not.toBeInTheDocument();
  });

  it('stays on the page when the create was refused, so the entry is not lost', async () => {
    create.mockRejectedValue(new Error('denied'));
    render(TriggerEditorPage, props());
    await focusSettled();

    await userEvent.type(screen.getByLabelText('Name'), 'hook');
    await userEvent.click(submitButton('Create'));

    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveValue('hook');
  });

  it('swaps the schedule builder for a signature header when the kind is webhook', async () => {
    render(TriggerEditorPage, props());
    await focusSettled();

    await userEvent.click(screen.getByLabelText('Type'));
    await userEvent.click(await findFloating('option', 'Webhook'));

    expect(screen.getByRole('region', { name: 'Webhook' })).toBeInTheDocument();
    expect(screen.getByLabelText('Signature header')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Schedule' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /daily/i })).not.toBeInTheDocument();
  });

  it('goes back to the list on cancel, and writes nothing', async () => {
    render(TriggerEditorPage, props());

    await userEvent.type(screen.getByLabelText('Name'), 'hook');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(navigator.navigate).toHaveBeenCalledWith(LIST_PATH, undefined);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('TriggerEditorPage — edit mode', () => {
  it('seeds the form from the trigger of the pipeline list and locks its kind', async () => {
    render(TriggerEditorPage, props({ triggerId: 'trigger-1' }));

    expect(await screen.findByLabelText('Name')).toHaveValue('nightly');
    expect(listByPipelineId).toHaveBeenCalledWith('pipeline-1');
    expect(screen.getByRole('heading', { level: 1, name: 'Edit trigger' })).toBeInTheDocument();
    expect(
      screen.getByText("Type can't be changed. Delete and recreate to switch."),
    ).toBeInTheDocument();
  });

  it('updates by trigger id rather than creating a second one, then goes back to the list', async () => {
    listByPipelineId.mockResolvedValue(
      ScyllaResult.success([trigger({ id: 'trigger-9' })]),
    );
    render(TriggerEditorPage, props({ triggerId: 'trigger-9' }));
    await focusSettled();

    await userEvent.type(await screen.findByLabelText('Name'), '-v2');
    await userEvent.click(submitButton('Save'));

    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    const [triggerId, draft] = update.mock.calls[0];
    expect(triggerId).toBe('trigger-9');
    expect(draft.name).toBe('nightly-v2');
    expect(create).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(navigator.navigate).toHaveBeenCalledWith(LIST_PATH, undefined));
  });

  it('says so for a trigger that is not in the pipeline', async () => {
    render(TriggerEditorPage, props({ triggerId: 'ghost' }));

    expect(await screen.findByText('This trigger does not exist.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('refuses to re-send a source arm this build cannot render', async () => {
    listByPipelineId.mockResolvedValue(
      ScyllaResult.success([trigger({ source: { kind: TriggerKind.Unknown } })]),
    );
    render(TriggerEditorPage, props({ triggerId: 'trigger-1' }));

    await screen.findByLabelText('Name');
    expect(submitButton('Save')).toBeDisabled();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('keeps a webhook trigger on its signature header field', async () => {
    listByPipelineId.mockResolvedValue(
      ScyllaResult.success([
        trigger({
          source: {
            kind: TriggerKind.Webhook,
            signatureHeader: 'X-Hub-Signature-256',
            webhookUrl: 'https://x/y',
          },
        }),
      ]),
    );
    render(TriggerEditorPage, props({ triggerId: 'trigger-1' }));

    expect(await screen.findByLabelText('Signature header')).toHaveValue('X-Hub-Signature-256');
  });
});
