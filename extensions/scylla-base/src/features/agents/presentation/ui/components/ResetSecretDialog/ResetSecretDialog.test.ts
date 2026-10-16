import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { AppSecretEntity, ResetAppSecret } from '@base/features/apps';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import ResetSecretDialog from './ResetSecretDialog.svelte';

const agent: AgentEntity = {
  id: 'agent-1',
  organizationId: 'org-1',
  name: 'prelude-deployer',
  isActive: true,
  connected: true,
  lastSeen: '2026-10-11T08:00:00.000Z',
  inFlight: 0,
  host: null,
  createdAt: '',
  updatedAt: '',
};

const secret = (id: string, label: string): AppSecretEntity => ({
  id,
  appId: 'agent-1',
  label,
  enabled: true,
  createdAt: '',
  updatedAt: '',
});

const host = {
  version: '0.5.0',
  os: 'linux',
  arch: 'x86_64',
  hostname: 'Deploy-01.example.com',
  cpuCount: 4,
  totalMemoryMb: 8192,
  reportedAt: '2026-10-11T08:00:00.000Z',
};

const NEW_SECRET = 'plain-123';

let execute: ReturnType<typeof vi.fn>;
let listAppSecrets: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

beforeEach(() => {
  // The orchestration is `ResetAppSecretUseCase`, tested in `apps`: this fake answers as it does.
  execute = vi.fn().mockImplementation(({ revokeOthers }: { revokeOthers: boolean }) =>
    Promise.resolve(
      ScyllaResult.success<ResetAppSecret>({
        created: { credential: secret('s-new', 'reset-2026-10-11'), secret: NEW_SECRET },
        revoked: revokeOthers ? [secret('s-default', 'default')] : [],
        kept: revokeOthers ? [] : [secret('s-default', 'default')],
        failed: [],
      }),
    ),
  );

  listAppSecrets = vi
    .fn()
    .mockResolvedValue(ScyllaResult.success([secret('s-default', 'default')]));

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    apps: {
      appsRepository: { listAppSecrets },
      resetAppSecret: { execute },
    },
  });
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

const confirmStep = async () => {
  const dialog = await screen.findByRole('alertdialog');
  await within(dialog).findByText(/Uncheck to keep “default”/);
  return within(dialog);
};

const revealStep = () => screen.findByRole('heading', { name: 'New secret for prelude-deployer' });

describe('ResetSecretDialog', () => {
  it('stays closed without an agent', () => {
    render(ResetSecretDialog, { agent: null, onClose: vi.fn() });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('names the old secret it offers to keep', async () => {
    render(ResetSecretDialog, { agent, onClose: vi.fn() });

    const dialog = await confirmStep();
    expect(dialog.getByText('Reset the secret of prelude-deployer?')).toBeInTheDocument();
    expect(dialog.getByRole('checkbox', { name: 'Revoke the old secrets now' })).toBeChecked();
  });

  it('says the agent disconnects only when the old secrets are revoked', async () => {
    render(ResetSecretDialog, { agent, onClose: vi.fn() });
    const dialog = await confirmStep();

    expect(
      dialog.getByText(/The old secrets stop working, so the agent disconnects/),
    ).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('checkbox', { name: 'Revoke the old secrets now' }));

    expect(
      dialog.getByText(/The old secrets keep working until you revoke them/),
    ).toBeInTheDocument();
    expect(dialog.queryByText(/disconnects/)).not.toBeInTheDocument();
  });

  it('asks for the old secrets to go when the box stays checked', async () => {
    render(ResetSecretDialog, { agent, onClose: vi.fn() });
    const dialog = await confirmStep();

    await userEvent.click(dialog.getByRole('button', { name: 'Reset secret' }));

    expect(await revealStep()).toBeInTheDocument();
    expect(execute).toHaveBeenCalledWith({
      appId: 'agent-1',
      label: 'prelude-deployer',
      revokeOthers: true,
    });
    expect(screen.getByText('The old secret “default” is revoked.')).toBeInTheDocument();
  });

  it('keeps the old secrets when the box is unchecked, and says so', async () => {
    render(ResetSecretDialog, { agent, onClose: vi.fn() });
    const dialog = await confirmStep();

    await userEvent.click(dialog.getByRole('checkbox', { name: 'Revoke the old secrets now' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Reset secret' }));

    expect(await revealStep()).toBeInTheDocument();
    expect(execute).toHaveBeenCalledWith({
      appId: 'agent-1',
      label: 'prelude-deployer',
      revokeOthers: false,
    });
    expect(screen.getByText('The old secret “default” stays enabled.')).toBeInTheDocument();
  });

  it('shows the secret once: Done drops it, and the next opening starts over', async () => {
    const onClose = vi.fn();
    const { rerender } = render(ResetSecretDialog, { agent, onClose });
    const dialog = await confirmStep();
    await userEvent.click(dialog.getByRole('button', { name: 'Reset secret' }));
    await revealStep();
    await userEvent.click(screen.getByRole('button', { name: 'Show the secret' }));
    expect(screen.getByText(NEW_SECRET)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(onClose).toHaveBeenCalled();
    await rerender({ agent: null });
    expect(document.body.innerHTML).not.toContain(NEW_SECRET);

    await rerender({ agent });
    await confirmStep();
    expect(document.body.innerHTML).not.toContain(NEW_SECRET);
  });

  it('shows the new secret in one box only, masked, and copies the real value', async () => {
    render(ResetSecretDialog, { agent, onClose: vi.fn() });
    const dialog = await confirmStep();
    await userEvent.click(dialog.getByRole('button', { name: 'Reset secret' }));
    await revealStep();
    const reveal = within(screen.getByRole('dialog', { name: 'New secret for prelude-deployer' }));

    expect(reveal.getAllByRole('button', { name: 'Copy' })).toHaveLength(1);
    expect(reveal.queryByText('Agent variables')).not.toBeInTheDocument();
    expect(reveal.queryByText(/SCYLLA_APP_ID/)).not.toBeInTheDocument();
    expect(
      reveal.getByText(
        'Put it in SCYLLA_APP_SECRET (or --app-secret) on the agent machine, then restart the agent.',
      ),
    ).toBeInTheDocument();
    expect(reveal.getByText('•'.repeat(NEW_SECRET.length))).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(NEW_SECRET);

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await fireEvent.click(reveal.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledExactlyOnceWith(NEW_SECRET);
    expect(document.body.innerHTML).not.toContain(NEW_SECRET);

    const eye = reveal.getByRole('button', { name: 'Show the secret' });
    await fireEvent.click(eye);
    expect(reveal.getByText(NEW_SECRET)).toBeInTheDocument();
    expect(eye).toHaveAttribute('aria-pressed', 'true');

    await fireEvent.click(eye);
    expect(eye).toHaveAttribute('aria-pressed', 'false');
    expect(document.body.innerHTML).not.toContain(NEW_SECRET);
  });

  it('suggests the last hostname of the agent as the name of the new secret, as it is', async () => {
    render(ResetSecretDialog, { agent: { ...agent, host }, onClose: vi.fn() });
    const dialog = await confirmStep();

    expect(dialog.getByRole('textbox', { name: 'Name of the new secret' })).toHaveValue(
      'Deploy-01.example.com',
    );
  });

  it('suggests the agent name when the agent never connected', async () => {
    render(ResetSecretDialog, { agent, onClose: vi.fn() });
    const dialog = await confirmStep();

    expect(dialog.getByRole('textbox', { name: 'Name of the new secret' })).toHaveValue(
      'prelude-deployer',
    );
  });

  it('adds a suffix to the suggestion when another secret has the name', async () => {
    listAppSecrets.mockResolvedValue(
      ScyllaResult.success([
        secret('s-default', 'default'),
        secret('s-host', 'Deploy-01.example.com'),
      ]),
    );
    render(ResetSecretDialog, { agent: { ...agent, host }, onClose: vi.fn() });
    const dialog = within(await screen.findByRole('alertdialog'));

    await vi.waitFor(() =>
      expect(dialog.getByRole('textbox', { name: 'Name of the new secret' })).toHaveValue(
        'Deploy-01.example.com-2',
      ),
    );
  });

  it('sends the name that the user typed', async () => {
    render(ResetSecretDialog, { agent, onClose: vi.fn() });
    const dialog = await confirmStep();
    const field = dialog.getByRole('textbox', { name: 'Name of the new secret' });

    await userEvent.clear(field);
    await userEvent.type(field, ' laptop-ada ');
    await userEvent.click(dialog.getByRole('button', { name: 'Reset secret' }));

    await revealStep();
    expect(execute).toHaveBeenCalledWith({
      appId: 'agent-1',
      label: 'laptop-ada',
      revokeOthers: true,
    });
  });

  it('trims the name as CE does: a leading U+0085 goes, which JS trim keeps', async () => {
    render(ResetSecretDialog, { agent, onClose: vi.fn() });
    const dialog = await confirmStep();
    const field = dialog.getByRole('textbox', { name: 'Name of the new secret' });

    await userEvent.clear(field);
    await userEvent.type(field, '\u0085abc');
    await userEvent.click(dialog.getByRole('button', { name: 'Reset secret' }));

    await revealStep();
    expect(execute).toHaveBeenCalledWith({ appId: 'agent-1', label: 'abc', revokeOthers: true });
  });

  it('refuses an empty or taken name under the field, before any call', async () => {
    render(ResetSecretDialog, { agent, onClose: vi.fn() });
    const dialog = await confirmStep();
    const field = dialog.getByRole('textbox', { name: 'Name of the new secret' });

    await userEvent.clear(field);
    expect(dialog.getByText('Enter a name for the secret.')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(dialog.getByRole('button', { name: 'Reset secret' })).toBeDisabled();

    await userEvent.type(field, 'default');
    expect(dialog.getByText('Another secret of this agent has this name.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Reset secret' })).toBeDisabled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('shows a name that CE says is taken under the field, and keeps the step', async () => {
    execute.mockResolvedValue(
      ScyllaResult.error(new ScyllaError('taken', { cause: { code: 'ALREADY_EXISTS' } })),
    );
    render(ResetSecretDialog, { agent, onClose: vi.fn() });
    const dialog = await confirmStep();

    await userEvent.click(dialog.getByRole('button', { name: 'Reset secret' }));

    expect(
      await dialog.findByText('Another secret of this agent has this name.'),
    ).toBeInTheDocument();
    const field = dialog.getByRole('textbox', { name: 'Name of the new secret' });
    expect(field).toHaveValue('prelude-deployer');
    expect(field).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancels without a call', async () => {
    const onClose = vi.fn();
    render(ResetSecretDialog, { agent, onClose });
    const dialog = await confirmStep();

    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('lays out both steps as a header, a body and a footer band, with no icon column', async () => {
    render(ResetSecretDialog, { agent, onClose: vi.fn() });
    const confirm = await screen.findByRole('alertdialog');
    await within(confirm).findByText(/Uncheck to keep “default”/);

    const partsOf = (element: HTMLElement) => [...element.querySelectorAll('[data-dialog-part]')];
    const first = partsOf(confirm);
    expect(first.map(part => part.getAttribute('data-dialog-part'))).toEqual([
      'header',
      'body',
      'footer',
    ]);
    expect(first[0].querySelector('svg')).toBeNull();
    expect(first[0]).toHaveTextContent('Scylla makes a new secret and shows it one time.');

    await userEvent.click(within(confirm).getByRole('button', { name: 'Reset secret' }));
    await revealStep();

    const reveal = screen.getByRole('dialog');
    const second = partsOf(reveal);
    expect(second.map(part => part.getAttribute('data-dialog-part'))).toEqual([
      'header',
      'body',
      'footer',
    ]);
    expect(second[0].querySelector('svg')).toBeNull();
    expect(within(second[1] as HTMLElement).getByText('Shown one time')).toBeInTheDocument();
    expect(
      within(second[1] as HTMLElement).queryByText('Agent variables'),
    ).not.toBeInTheDocument();
    expect(second[2]).toHaveTextContent('You will not see this secret again.');
  });
});
