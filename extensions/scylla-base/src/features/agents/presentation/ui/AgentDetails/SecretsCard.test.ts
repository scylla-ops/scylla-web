import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { AppSecretEntity } from '@base/features/apps';
import SecretsCard from './SecretsCard.svelte';

const secret = (id: string, label: string): AppSecretEntity => ({
  id,
  appId: 'agent-1',
  label,
  enabled: true,
  createdAt: '2026-10-11T08:00:00.000Z',
  updatedAt: '2026-10-11T08:00:00.000Z',
});

const secrets = [secret('s-1', 'build-runner-02'), secret('s-2', 'laptop-ada')];

let setAppSecretLabel: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

beforeEach(() => {
  setAppSecretLabel = vi
    .fn()
    .mockImplementation((id: string, label: string) =>
      Promise.resolve(ScyllaResult.success(secret(id, label))),
    );
  cache = withQueryClient();
  restoreRegistry = withRegistry({ apps: { appsRepository: { setAppSecretLabel } } });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
});

const props = (canManage: boolean) => ({
  secrets,
  loading: false,
  canManage,
  onToggle: vi.fn(),
  onRevoke: vi.fn(),
});

describe('SecretsCard', () => {
  it('offers no rename to a user who cannot manage the agent', () => {
    render(SecretsCard, props(false));

    expect(screen.getByText('build-runner-02')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Actions of the secret build-runner-02' }),
    ).not.toBeInTheDocument();
  });

  it('renames a secret from its menu, with the labels of the other secrets taken', async () => {
    render(SecretsCard, props(true));

    await userEvent.click(
      screen.getByRole('button', { name: 'Actions of the secret build-runner-02' }),
    );
    await userEvent.click(await findFloating('menuitem', 'Rename'));

    const dialog = within(await screen.findByRole('alertdialog'));
    const field = dialog.getByRole('textbox', { name: 'Name' });
    expect(field).toHaveValue('build-runner-02');

    await userEvent.clear(field);
    await userEvent.type(field, 'laptop-ada');
    expect(dialog.getByText('Another secret of this agent has this name.')).toBeInTheDocument();

    await userEvent.clear(field);
    await userEvent.type(field, 'runner.local');
    await userEvent.click(dialog.getByRole('button', { name: 'Rename' }));

    await vi.waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(setAppSecretLabel).toHaveBeenCalledWith('s-1', 'runner.local');
  });
});
