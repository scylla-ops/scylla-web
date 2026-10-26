import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { AppSecretEntity } from '@base/features/apps';
import RenameSecretDialog from './RenameSecretDialog.svelte';

const secret = (id: string, label: string): AppSecretEntity => ({
  id,
  appId: 'agent-1',
  label,
  enabled: true,
  createdAt: '',
  updatedAt: '',
});

const first = secret('s-1', 'build-runner-02');
const secrets = [first, secret('s-2', 'laptop-ada')];

let setAppSecretLabel: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

beforeEach(() => {
  setAppSecretLabel = vi
    .fn()
    .mockImplementation((id: string, label: string) => Promise.resolve(secret(id, label)));
  cache = withQueryClient();
  restoreRegistry = withRegistry({ apps: { appsRepository: { setAppSecretLabel } } });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
});

const open = async (onClose = vi.fn()) => {
  render(RenameSecretDialog, { secret: first, secrets, onClose });
  const dialog = within(await screen.findByRole('alertdialog'));
  await focusSettled();
  return { dialog, field: dialog.getByRole('textbox', { name: 'Name' }), onClose };
};

describe('RenameSecretDialog', () => {
  it('stays closed without a secret', () => {
    render(RenameSecretDialog, { secret: null, secrets, onClose: vi.fn() });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('starts from the current name and needs a change before it saves', async () => {
    const { dialog, field } = await open();

    expect(dialog.getByText('Rename “build-runner-02”')).toBeInTheDocument();
    expect(field).toHaveValue('build-runner-02');
    expect(dialog.getByRole('button', { name: 'Rename' })).toBeDisabled();
  });

  it('stores the trimmed name, then closes', async () => {
    const { dialog, field, onClose } = await open();

    await userEvent.clear(field);
    await userEvent.type(field, ' Build-01.example.com ');
    await userEvent.click(dialog.getByRole('button', { name: 'Rename' }));

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(setAppSecretLabel).toHaveBeenCalledWith('s-1', 'Build-01.example.com');
  });

  it('trims the name as CE does: a leading U+0085 goes, which JS trim keeps', async () => {
    const { dialog, field, onClose } = await open();

    await userEvent.clear(field);
    await userEvent.type(field, '\u0085build-runner-02');
    expect(dialog.getByRole('button', { name: 'Rename' })).toBeDisabled();

    await userEvent.clear(field);
    await userEvent.type(field, '\u0085abc');
    await userEvent.click(dialog.getByRole('button', { name: 'Rename' }));

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(setAppSecretLabel).toHaveBeenCalledWith('s-1', 'abc');
  });

  it('refuses the name of another secret of the agent under the field, before any call', async () => {
    const { dialog, field } = await open();

    await userEvent.clear(field);
    await userEvent.type(field, 'laptop-ada');

    expect(dialog.getByText('Another secret of this agent has this name.')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(dialog.getByRole('button', { name: 'Rename' })).toBeDisabled();
    expect(setAppSecretLabel).not.toHaveBeenCalled();
  });

  it('refuses a name over 64 bytes', async () => {
    const { dialog, field } = await open();

    await userEvent.clear(field);
    await userEvent.type(field, 'é'.repeat(33));

    expect(
      dialog.getByText(
        'The name is too long: 64 bytes at most. An accented letter counts as 2, some characters count as 3 or 4.',
      ),
    ).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Rename' })).toBeDisabled();
  });

  it('shows a name that CE says is taken under the field, and stays open', async () => {
    setAppSecretLabel.mockRejectedValue(new ScyllaError('taken', { code: 'ALREADY_EXISTS' }));
    const { dialog, field, onClose } = await open();

    await userEvent.clear(field);
    await userEvent.type(field, 'ci');
    await userEvent.click(dialog.getByRole('button', { name: 'Rename' }));

    expect(
      await dialog.findByText('Another secret of this agent has this name.'),
    ).toBeInTheDocument();
    expect(field).toHaveValue('ci');
    expect(field).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.keyboard('-2');
    expect(
      dialog.queryByText('Another secret of this agent has this name.'),
    ).not.toBeInTheDocument();
  });

  it('cancels without a call', async () => {
    const { dialog, onClose } = await open();

    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(setAppSecretLabel).not.toHaveBeenCalled();
  });

  it('lays out a header, a body and a footer band', async () => {
    await open();

    const parts = [...screen.getByRole('alertdialog').querySelectorAll('[data-dialog-part]')];
    expect(parts.map(part => part.getAttribute('data-dialog-part'))).toEqual([
      'header',
      'body',
      'footer',
    ]);
  });
});
