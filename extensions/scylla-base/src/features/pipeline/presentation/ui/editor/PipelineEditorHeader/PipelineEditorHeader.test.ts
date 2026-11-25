import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { render } from '@test/render.ts';
import PipelineEditorHeaderFixture from './PipelineEditorHeader.fixture.svelte';

const onSubmit = vi.fn();
const onNameChange = vi.fn();

const grantOnly = (...permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        { scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'restricted', permissions } },
      ],
    },
  });

const renderHeader = (props: Record<string, unknown> = {}) =>
  render(PipelineEditorHeaderFixture, {
    onSubmit,
    submitLabel: 'Save',
    mode: 'edit',
    isDirty: false,
    pipelineName: 'nightly',
    onNameChange,
    ...props,
  });

beforeEach(() => vi.clearAllMocks());

describe('PipelineEditorHeader', () => {
  it('shows a draft for a pipeline that does not exist yet', () => {
    grantOnly(Permission.CREATE_PIPELINE);
    renderHeader({ mode: 'create', submitLabel: 'Create' });

    expect(screen.getByText('Draft: not created yet')).toBeInTheDocument();
  });

  it('gives the agent labels of a new pipeline to the page, which sends them with Create', async () => {
    const onAgentLabelsChange = vi.fn();
    grantOnly(Permission.CREATE_PIPELINE);
    renderHeader({ mode: 'create', submitLabel: 'Create', agentLabels: [], onAgentLabelsChange });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Agent labels' }));
    // jsdom leaves the floating layer `visibility: hidden`, and a hidden field has no name.
    const field = await screen.findByPlaceholderText('deploy');
    await waitFor(() => expect(field).toHaveFocus());
    await user.type(field, 'linux{Enter}');

    expect(onAgentLabelsChange).toHaveBeenCalledExactlyOnceWith(['linux']);
    expect(screen.getByText('Create saves these labels with the pipeline.')).toBeInTheDocument();
    expect(screen.queryByText('Save labels')).not.toBeInTheDocument();
  });

  it('shows the count of the agent labels of a new pipeline on its button', () => {
    grantOnly(Permission.CREATE_PIPELINE);
    renderHeader({
      mode: 'create',
      submitLabel: 'Create',
      agentLabels: ['deploy', 'linux'],
      onAgentLabelsChange: vi.fn(),
    });

    expect(screen.getByRole('button', { name: 'Agent labels 2' })).toBeInTheDocument();
  });

  it('says why the pipeline cannot be saved, and disables Save', () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader({ isDirty: true, issue: 'Two nodes or more have the ID build.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Two nodes or more have the ID build.');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows unsaved changes, then saving, then saved', async () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    const { rerender } = renderHeader({ isDirty: true });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    await rerender({ isDirty: true, isSaving: true });
    expect(screen.getByText('Saving…')).toBeInTheDocument();

    await rerender({ isDirty: false, isSaving: false });
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
  });

  it('shows a failed save with its message, and goes back to the normal states', async () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    const { rerender } = renderHeader({ isDirty: true, saveError: 'Name already used.' });

    expect(screen.getByRole('status')).toHaveAttribute('title', 'Name already used.');
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();

    await rerender({ isDirty: true, saveError: undefined });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('submits when the user may edit the pipeline', async () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader({ isDirty: true });

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalled();
  });

  it('disables the submit button for a user who may not edit the pipeline', () => {
    grantOnly();
    renderHeader({ isDirty: true });

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('disables the blueprint tab when the script is invalid', () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader({ blueprintDisabled: true });

    expect(screen.getByRole('tab', { name: 'Blueprint' })).toBeDisabled();
  });

  it('waits for the pipeline with no name, no status and nothing to save', () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader({ missing: 'loading', pipelineName: '' });

    expect(screen.queryByRole('textbox', { name: 'Pipeline name' })).not.toBeInTheDocument();
    expect(screen.queryByText('All changes saved')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Scripting' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Blueprint' })).toBeEnabled();
  });

  it('disables the name of a pipeline that failed to load', () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader({ missing: 'failed', pipelineName: '' });

    expect(screen.getByRole('textbox', { name: 'Pipeline name' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('renames the pipeline in place, on Enter', async () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader();

    const name = screen.getByRole('textbox', { name: 'Pipeline name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'release{Enter}');

    expect(onNameChange).toHaveBeenCalledExactlyOnceWith('release');
  });

  it('saves a name with spaces', async () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader();

    const name = screen.getByRole('textbox', { name: 'Pipeline name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Branch Policy{Enter}');

    expect(onNameChange).toHaveBeenCalledExactlyOnceWith('Branch Policy');
  });

  it('says why a name the server refuses is refused, and gives the saved one back on blur', async () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader();

    const name = screen.getByRole('textbox', { name: 'Pipeline name' });
    await userEvent.type(name, 'a'.repeat(100));

    expect(name).toHaveAccessibleDescription('The name cannot be longer than 100 characters.');
    await userEvent.tab();
    expect(onNameChange).not.toHaveBeenCalled();
    expect(name).toHaveValue('nightly');
  });

  it('says which file has the key of a typed name, and still applies it: the page keeps Save off', async () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    const keyIssueOf = (name: string) =>
      name === 'build' ? 'The file .scylla/pipelines/build.yaml already uses the key build.' : null;
    renderHeader({ keyIssueOf });

    const name = screen.getByRole('textbox', { name: 'Pipeline name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'build');

    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription(
      'The file .scylla/pipelines/build.yaml already uses the key build.',
    );
    await userEvent.keyboard('{Enter}');
    expect(onNameChange).toHaveBeenCalledExactlyOnceWith('build');
  });

  it('turns Save off with the reason while the typed name is a file key, before the name is applied', async () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    const keyIssueOf = (name: string) =>
      name === 'build' ? 'The file .scylla/pipelines/build.yaml already uses the key build.' : null;
    renderHeader({ keyIssueOf, isDirty: true });

    const name = screen.getByRole('textbox', { name: 'Pipeline name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'build');
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toHaveAttribute('aria-disabled', 'true');
    expect(save).toHaveAccessibleDescription(
      'The file .scylla/pipelines/build.yaml already uses the key build.',
    );

    await userEvent.type(name, ' 2');
    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('aria-disabled');
  });

  it('gives the saved name back on Escape', async () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader();

    const name = screen.getByRole('textbox', { name: 'Pipeline name' });
    await userEvent.type(name, '-v2{Escape}');

    expect(onNameChange).not.toHaveBeenCalled();
    expect(name).toHaveValue('nightly');
  });

  it('tells each key of a typed name before it is applied, and the saved name on Escape', async () => {
    const onNameDraft = vi.fn();
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader({ onNameDraft });

    const name = screen.getByRole('textbox', { name: 'Pipeline name' });
    await userEvent.type(name, '-v');
    expect(onNameDraft).toHaveBeenLastCalledWith('nightly-v');
    expect(onNameChange).not.toHaveBeenCalled();

    await userEvent.keyboard('{Escape}');
    expect(onNameDraft).toHaveBeenLastCalledWith('nightly');
  });

  it('shows Export for a saved pipeline only, to a user who may read it', async () => {
    const onExport = vi.fn();
    grantOnly(Permission.UPDATE_PIPELINE, Permission.READ_PIPELINE);
    const { rerender } = renderHeader();
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();

    await rerender({ onExport });
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(onExport).toHaveBeenCalled();
  });

  it('keeps Export inert for a user who may not read the pipeline', () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader({ onExport: vi.fn() });

    expect(screen.getByRole('button', { name: 'Export' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps Export inert and says why when the saved pipeline cannot be a file', async () => {
    const onExport = vi.fn();
    grantOnly(Permission.UPDATE_PIPELINE, Permission.READ_PIPELINE);
    renderHeader({ onExport, exportIssue: 'A file cannot hold them yet.' });

    const exportButton = screen.getByRole('button', { name: 'Export' });
    await userEvent.click(exportButton);

    expect(exportButton).toHaveAttribute('aria-disabled', 'true');
    expect(exportButton).toHaveAccessibleDescription('A file cannot hold them yet.');
    expect(onExport).not.toHaveBeenCalled();
  });
});
