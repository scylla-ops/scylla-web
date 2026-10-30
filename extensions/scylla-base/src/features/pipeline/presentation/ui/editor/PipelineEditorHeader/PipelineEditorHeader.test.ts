import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/svelte';
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

  it('renames the pipeline in place, on Enter', async () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader();

    const name = screen.getByRole('textbox', { name: 'Pipeline name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'release{Enter}');

    expect(onNameChange).toHaveBeenCalledExactlyOnceWith('release');
  });

  it('says why a name with spaces is refused, and gives the saved one back on blur', async () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader();

    const name = screen.getByRole('textbox', { name: 'Pipeline name' });
    await userEvent.type(name, ' run');

    expect(name).toHaveAccessibleDescription('The name cannot contain spaces.');
    await userEvent.tab();
    expect(onNameChange).not.toHaveBeenCalled();
    expect(name).toHaveValue('nightly');
  });

  it('gives the saved name back on Escape', async () => {
    grantOnly(Permission.UPDATE_PIPELINE);
    renderHeader();

    const name = screen.getByRole('textbox', { name: 'Pipeline name' });
    await userEvent.type(name, '-v2{Escape}');

    expect(onNameChange).not.toHaveBeenCalled();
    expect(name).toHaveValue('nightly');
  });
});
