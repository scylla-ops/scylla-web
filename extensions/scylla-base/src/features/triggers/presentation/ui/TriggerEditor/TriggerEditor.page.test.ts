import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { findFloating, focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import type { TriggersRepository } from '@base/features/triggers/domain/repository/triggers.repository.ts';
import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';
import TriggerEditorPage from './TriggerEditor.page.svelte';

const trigger = (overrides: Partial<TriggerEntity> = {}): TriggerEntity => ({
  id: 'trigger-1',
  pipelineId: 'pipeline-1',
  name: 'nightly',
  source: { kind: 'cron', expression: '0 9 * * *' },
  inputs: [],
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  fromFile: false,
  ...overrides,
});

const LIST_PATH = '/acme/projects/project-1/pipelines/pipeline-1/triggers';

let listByPipelineId: ReturnType<typeof vi.fn>;
let create: ReturnType<typeof vi.fn>;
let update: ReturnType<typeof vi.fn>;
let getByProject: ReturnType<typeof vi.fn>;
let getWithLayout: ReturnType<typeof vi.fn>;

const withOrigin = (source: 'editor' | 'file') => ({
  pipeline: { id: 'pipeline-1', name: 'build', nodes: [] },
  layout: null,
  origin: {
    source,
    filePath: source === 'file' ? '.scylla/pipelines/build.toml' : '',
    fileErrorCount: 0,
  },
});

let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  listByPipelineId = vi.fn().mockResolvedValue([trigger()]);
  create = vi.fn().mockResolvedValue({ trigger: trigger() });
  update = vi.fn().mockResolvedValue(trigger());
  getByProject = vi.fn().mockResolvedValue(null);
  getWithLayout = vi.fn().mockResolvedValue(withOrigin('editor'));

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    triggers: {
      triggersRepository: { listByPipelineId, create, update } as unknown as TriggersRepository,
    },
    integrations: { repositoryLinkRepository: { getByProject } },
    pipeline: { pipelineRepository: { getWithLayout } },
  });
  navigator = installTestNavigator({ pathname: `${LIST_PATH}/new` });
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: null },
    project: { id: 'project-1', name: 'Web' },
    pipeline: { id: 'pipeline-1', name: 'build' },
  });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  navigator.restore();
  permissionsStore.setState({ permissions: null });
});

/** The link of the project can be read only with a permission. */
const allowEverything = () =>
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });

const linkOn = (provider: 'github' | 'gitlab') => ({
  projectId: 'project-1',
  provider,
  fullName: 'acme/api',
  webUrl: 'https://github.com/acme/api',
});

const chooseKind = async (label: string) => {
  await userEvent.click(screen.getByLabelText('Type'));
  await userEvent.click(await findFloating('option', label));
};

const props = (overrides: Record<string, unknown> = {}) => ({
  pipelineId: 'pipeline-1',
  projectId: 'project-1',
  ...overrides,
});

const submitButton = (name: 'Create' | 'Save') => screen.getByRole('button', { name });

describe('TriggerEditorPage — create mode', () => {
  it('lays the form out as titled sections on a page, not in a dialog', async () => {
    render(TriggerEditorPage, props());

    expect(
      await screen.findByRole('heading', { level: 1, name: 'New trigger' }),
    ).toBeInTheDocument();
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
    expect(draft.source.kind).toBe('cron');
    await vi.waitFor(() => expect(navigator.navigate).toHaveBeenCalledWith(LIST_PATH, undefined));
  });

  it('reveals a webhook secret once, and goes back to the list when it is closed', async () => {
    create.mockResolvedValue({ trigger: trigger({ name: 'hook' }), webhookSecret: 'whsec-once' });
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

  it('starts on the kind that the link names, as the panel of the start node opens it', async () => {
    navigator.restore();
    navigator = installTestNavigator({ pathname: `${LIST_PATH}/new`, search: '?kind=webhook' });
    render(TriggerEditorPage, props());

    expect(await screen.findByRole('region', { name: 'Webhook' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Schedule' })).not.toBeInTheDocument();
  });

  it('starts on a schedule when the link names no known kind', async () => {
    navigator.restore();
    navigator = installTestNavigator({ pathname: `${LIST_PATH}/new`, search: '?kind=ftp' });
    render(TriggerEditorPage, props());

    expect(await screen.findByRole('region', { name: 'Schedule' })).toBeInTheDocument();
  });

  it('swaps the schedule builder for the signature hint when the kind is webhook', async () => {
    render(TriggerEditorPage, props());
    await focusSettled();

    await userEvent.click(screen.getByLabelText('Type'));
    await userEvent.click(await findFloating('option', 'Webhook'));

    expect(screen.getByRole('region', { name: 'Webhook' })).toBeInTheDocument();
    expect(screen.getByText(/X-Scylla-Signature-256/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Schedule' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /daily/i })).not.toBeInTheDocument();
  });

  it('creates a webhook trigger with its conditions, and keeps Create off while one is not valid', async () => {
    render(TriggerEditorPage, props());
    await focusSettled();

    await userEvent.type(screen.getByLabelText('Name'), 'push-main');
    await chooseKind('Webhook');
    const conditions = screen.getByRole('region', { name: 'Conditions' });
    expect(conditions).toHaveTextContent('No condition: each delivery starts a run.');
    await userEvent.click(screen.getByRole('button', { name: 'Add condition' }));
    expect(submitButton('Create')).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Header name'), 'X-GitHub-Event');
    await userEvent.type(screen.getByLabelText('Value'), 'push');
    await vi.waitFor(() => expect(submitButton('Create')).toBeEnabled());
    await userEvent.click(submitButton('Create'));

    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    const [, draft] = create.mock.calls[0];
    expect(draft.source).toEqual({
      kind: 'webhook',
      conditions: [{ source: 'header', field: 'X-GitHub-Event', operator: 'is', values: ['push'] }],
    });
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
    listByPipelineId.mockResolvedValue([trigger({ id: 'trigger-9' })]);
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
    listByPipelineId.mockResolvedValue([trigger({ source: { kind: 'unknown' } })]);
    render(TriggerEditorPage, props({ triggerId: 'trigger-1' }));

    await screen.findByLabelText('Name');
    expect(submitButton('Save')).toBeDisabled();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('keeps a webhook trigger on the webhook section, with the signature hint', async () => {
    listByPipelineId.mockResolvedValue([
      trigger({
        source: {
          kind: 'webhook',
          webhookUrl: 'https://x/y',
          conditions: [],
        },
      }),
    ]);
    render(TriggerEditorPage, props({ triggerId: 'trigger-1' }));

    expect(await screen.findByRole('region', { name: 'Webhook' })).toHaveTextContent(
      'X-Hub-Signature-256',
    );
  });

  it('seeds the conditions of a webhook trigger, and sends them in the update', async () => {
    listByPipelineId.mockResolvedValue([
      trigger({
        source: {
          kind: 'webhook',
          webhookUrl: 'https://x/y',
          conditions: [
            { source: 'jsonPointer', field: '/ref', operator: 'is', values: ['refs/heads/main'] },
          ],
        },
      }),
    ]);
    render(TriggerEditorPage, props({ triggerId: 'trigger-1' }));

    expect(await screen.findByLabelText('JSON pointer')).toHaveValue('/ref');
    await userEvent.clear(screen.getByLabelText('Value'));
    await userEvent.type(screen.getByLabelText('Value'), 'refs/heads/dev');
    await userEvent.click(submitButton('Save'));

    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    const [, draft] = update.mock.calls[0];
    expect(draft.source.conditions).toEqual([
      { source: 'jsonPointer', field: '/ref', operator: 'is', values: ['refs/heads/dev'] },
    ]);
  });
});

describe('TriggerEditorPage — Git triggers', () => {
  it('creates a push trigger with its branches, and shows the variables and the fixed rules', async () => {
    allowEverything();
    getByProject.mockResolvedValue(linkOn('github'));
    render(TriggerEditorPage, props());
    await focusSettled();

    await userEvent.type(screen.getByLabelText('Name'), 'push-main');
    await chooseKind('Push');
    await userEvent.type(screen.getByLabelText('Branches to include'), 'main{Enter}');
    await userEvent.type(screen.getByLabelText('Branches to exclude'), 'dependabot/*{Enter}');
    await userEvent.click(submitButton('Create'));

    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][1].source).toEqual({
      kind: 'push',
      branches: ['main'],
      excludeBranches: ['dependabot/*'],
      skipCi: true,
    });
    expect(screen.getByRole('region', { name: 'When' })).toHaveTextContent(
      'A push to a matching branch of acme/api starts a run.',
    );
    expect(screen.getByRole('region', { name: 'Variables' })).toHaveTextContent('SCYLLA_GIT_SHA');
    expect(screen.getByText(/^Pull requests from forks wait for approval/)).toBeInTheDocument();
  });

  it('offers the Git kinds disabled with no linked repository, and a way to link one', async () => {
    allowEverything();
    render(TriggerEditorPage, props());
    await vi.waitFor(() => expect(getByProject).toHaveBeenCalledWith('project-1'));

    await userEvent.click(screen.getByLabelText('Type'));

    expect(await findFloating('option', 'Push')).toHaveAttribute('data-disabled');
    expect(await findFloating('option', 'Schedule')).not.toHaveAttribute('data-disabled');
    await userEvent.click(await findFloating('button', 'Link a repository first'));
    expect(navigator.navigate).toHaveBeenCalledWith(
      '/acme/projects/project-1/settings/repository',
      undefined,
    );
  });

  it('offers the Git kinds disabled on a file pipeline: its file gives them', async () => {
    allowEverything();
    getByProject.mockResolvedValue(linkOn('github'));
    getWithLayout.mockResolvedValue(withOrigin('file'));
    render(TriggerEditorPage, props());
    await vi.waitFor(() => expect(getWithLayout).toHaveBeenCalledWith('pipeline-1'));

    await userEvent.click(screen.getByLabelText('Type'));

    expect(await findFloating('option', 'Tag')).toHaveAttribute('data-disabled');
    expect(
      screen.getByText(
        'The on table of the pipeline file gives its push, pull request and tag triggers.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Link a repository first')).not.toBeInTheDocument();
  });

  it('names the pull request a merge request on GitLab, and needs at least one event', async () => {
    allowEverything();
    getByProject.mockResolvedValue(linkOn('gitlab'));
    render(TriggerEditorPage, props());
    await vi.waitFor(() => expect(getByProject).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText('Name'), 'mr-into-main');
    await chooseKind('Merge request');
    for (const event of ['Opened', 'New commits', 'Reopened', 'Ready for review']) {
      await userEvent.click(screen.getByLabelText(event));
    }

    expect(screen.getByLabelText('Skip draft merge requests')).toBeChecked();
    expect(screen.getByText('Choose at least one event.')).toBeInTheDocument();
    expect(submitButton('Create')).toBeDisabled();
  });

  describe('a Scylla pipeline in a project of files', () => {
    const filesLink = { ...linkOn('github'), pipelineSource: 'file' };

    it('lets an admin allow the Git events after a warning, then offers the Git kinds', async () => {
      allowEverything();
      getByProject.mockResolvedValue(filesLink);
      const setGitEvents = vi.fn().mockResolvedValue({
        ...withOrigin('editor').origin,
        gitEventsAllowedAt: '2026-11-25T10:00:00Z',
      });
      restoreRegistry();
      restoreRegistry = withRegistry({
        triggers: {
          triggersRepository: { listByPipelineId, create, update } as unknown as TriggersRepository,
        },
        integrations: { repositoryLinkRepository: { getByProject } },
        pipeline: { pipelineRepository: { getWithLayout, setGitEvents } },
      });
      render(TriggerEditorPage, props());
      await vi.waitFor(() => expect(getWithLayout).toHaveBeenCalledWith('pipeline-1'));
      await vi.waitFor(() => expect(getByProject).toHaveBeenCalled());

      await userEvent.click(screen.getByLabelText('Type'));
      expect(await findFloating('option', 'Push')).toHaveAttribute('data-disabled');
      expect(
        screen.getByText(
          'In a project of files, push, pull request and tag of a Scylla pipeline need the opt-in of a workspace admin.',
        ),
      ).toBeInTheDocument();
      await userEvent.click(await findFloating('button', 'Allow Git events'));

      const dialog = await screen.findByRole('alertdialog');
      expect(
        within(dialog).getByText('Allow the Git events of this pipeline?'),
      ).toBeInTheDocument();
      expect(within(dialog).getByText(/^The pushes, pull requests and tags/)).toBeInTheDocument();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Allow Git events' }));

      expect(setGitEvents).toHaveBeenCalledWith('pipeline-1', true);
      await vi.waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      await userEvent.click(screen.getByLabelText('Type'));
      expect(await findFloating('option', 'Push')).not.toHaveAttribute('data-disabled');
    });

    it('tells a member why the Git kinds are off, with no way to allow them', async () => {
      permissionsStore.setState({
        permissions: {
          scopes: [
            {
              scope: PermissionScope.SYSTEM,
              scopeId: '',
              access: {
                kind: 'restricted',
                permissions: Object.values(Permission).filter(
                  (permission): permission is Permission =>
                    typeof permission === 'number' &&
                    permission !== Permission.SET_PIPELINE_GIT_EVENTS,
                ),
              },
            },
          ],
        },
      });
      getByProject.mockResolvedValue(filesLink);
      render(TriggerEditorPage, props());
      await vi.waitFor(() => expect(getWithLayout).toHaveBeenCalledWith('pipeline-1'));
      await vi.waitFor(() => expect(getByProject).toHaveBeenCalled());

      await userEvent.click(screen.getByLabelText('Type'));

      expect(await findFloating('option', 'Tag')).toHaveAttribute('data-disabled');
      expect(screen.getByText(/^In a project of files, push, pull request/)).toBeInTheDocument();
      expect(screen.queryByText('Allow Git events')).not.toBeInTheDocument();
    });

    it('offers the Git kinds once an admin allowed them', async () => {
      allowEverything();
      getByProject.mockResolvedValue(filesLink);
      getWithLayout.mockResolvedValue({
        ...withOrigin('editor'),
        origin: { ...withOrigin('editor').origin, gitEventsAllowedAt: '2026-11-25T10:00:00Z' },
      });
      render(TriggerEditorPage, props());
      await vi.waitFor(() => expect(getWithLayout).toHaveBeenCalledWith('pipeline-1'));
      await vi.waitFor(() => expect(getByProject).toHaveBeenCalled());

      await userEvent.click(screen.getByLabelText('Type'));

      expect(await findFloating('option', 'Push')).not.toHaveAttribute('data-disabled');
    });
  });

  it('sends the new rules of a Git trigger on save', async () => {
    listByPipelineId.mockResolvedValue([
      trigger({ name: 'tags', source: { kind: 'tag', patterns: ['v*'] } }),
    ]);
    render(TriggerEditorPage, props({ triggerId: 'trigger-1' }));
    await focusSettled();

    await userEvent.type(await screen.findByLabelText('Tag patterns'), 'release-*{Enter}');
    await userEvent.click(submitButton('Save'));

    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][1].source).toEqual({ kind: 'tag', patterns: ['v*', 'release-*'] });
    expect(screen.getByText('Tag')).toBeInTheDocument();
  });

  it('shows a trigger of a pipeline file as read only, with no form', async () => {
    listByPipelineId.mockResolvedValue([
      trigger({ fromFile: true, source: { kind: 'tag', patterns: ['v*'] } }),
    ]);
    render(TriggerEditorPage, props({ triggerId: 'trigger-1' }));

    expect(
      await screen.findByText(
        'This trigger comes from the pipeline file. Change the file to change it.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });
});
