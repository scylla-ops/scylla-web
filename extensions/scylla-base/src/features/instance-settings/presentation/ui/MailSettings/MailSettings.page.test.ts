import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import type {
  MailRelay,
  MailSettings,
} from '@base/features/instance-settings/domain/entities/mail-settings.entity.ts';
import type { MailSettingsRepository } from '@base/features/instance-settings/domain/repository/mail-settings.repository.ts';
import MailSettingsPage from './MailSettings.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const RELAY: MailRelay = {
  host: 'smtp-relay.brevo.com',
  port: 587,
  security: 'starttls',
  username: 'login',
  passwordSet: true,
  fromAddress: 'no-reply@scylla.example',
  fromName: 'Scylla',
};

let teardown: Array<() => void> = [];
let repository: { [K in keyof MailSettingsRepository]: Mock<MailSettingsRepository[K]> };

const setUp = (settings: MailSettings, access: unknown = { kind: 'fullControl' }) => {
  permissionsStore.setState({
    permissions: { scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access }] },
  } as never);
  repository = {
    get: vi.fn<MailSettingsRepository['get']>().mockResolvedValue(settings),
    update: vi.fn<MailSettingsRepository['update']>(input =>
      Promise.resolve({
        relay: {
          ...input,
          passwordSet: input.password !== undefined || settings.relay?.passwordSet === true,
        },
        defaultHost: settings.defaultHost,
      }),
    ),
    reset: vi
      .fn<MailSettingsRepository['reset']>()
      .mockResolvedValue({ relay: null, defaultHost: settings.defaultHost }),
    sendTest: vi.fn<MailSettingsRepository['sendTest']>(),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      'instance-settings': { instanceSettingsRepository: {}, mailSettingsRepository: repository },
    }),
  ];
  render(MailSettingsPage);
};

const field = (name: string | RegExp) => screen.findByLabelText(name);

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('MailSettingsPage', () => {
  it('fills the host, the port and the security from a provider, and saves the relay', async () => {
    setUp({ relay: null, defaultHost: '' });
    const user = userEvent.setup();

    expect(
      await screen.findByText(/Scylla has no mail server: it writes the mails to its log/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Provider' }));
    await user.click(await findFloating('option', 'Scaleway TEM'));

    expect(await field('Host')).toHaveValue('smtp.tem.scaleway.com');
    expect(await field('Port')).toHaveValue('465');
    expect(screen.getByRole('combobox', { name: 'Security' })).toHaveTextContent('TLS on connect');
    expect(screen.getByText(/User name: the ID of your Scaleway project/)).toBeInTheDocument();

    await user.type(await field('User name'), 'project-id');
    await user.type(await field(/Password or API key/), 'typed-secret');
    await user.type(await field('Sender address'), 'no-reply@scylla.example');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(repository.update).toHaveBeenCalledWith({
        host: 'smtp.tem.scaleway.com',
        port: 465,
        security: 'tls',
        username: 'project-id',
        password: 'typed-secret',
        fromAddress: 'no-reply@scylla.example',
        fromName: '',
      }),
    );
    // The page shows the saved relay, and never the password.
    await waitFor(async () => expect(await field(/Password or API key/)).toHaveValue(''));
    expect(screen.getByText('Set')).toBeInTheDocument();
  });

  it('shows the state of the password, and keeps it when the admin types no new one', async () => {
    setUp({ relay: RELAY, defaultHost: 'smtp.default.example' });
    const user = userEvent.setup();

    const password = await field(/Password or API key/);
    expect(password).toHaveValue('');
    expect(password).toHaveAttribute('placeholder', 'Type a new one to replace it');
    expect(screen.getByText('Set')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Provider' })).toHaveTextContent('Brevo');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.clear(await field('Sender name'));
    await user.type(await field('Sender name'), 'Scylla Ops');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(repository.update).toHaveBeenCalledTimes(1));
    expect(repository.update.mock.calls[0]?.[0]).not.toHaveProperty('password');
    expect(repository.update.mock.calls[0]?.[0]).toMatchObject({ fromName: 'Scylla Ops' });
  });

  it('shows each wrong field and sends nothing', async () => {
    setUp({ relay: null, defaultHost: '' });
    const user = userEvent.setup();

    await user.type(await field('Host'), 'smtp.example.com');
    await user.clear(await field('Port'));
    await user.type(await field('Port'), '0');
    await user.type(await field('User name'), 'login');
    await user.type(await field('Sender address'), 'no-reply');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await field('Port')).toHaveAccessibleDescription('Type a port from 1 to 65535.');
    expect(await field(/Password or API key/)).toHaveAttribute('aria-invalid', 'true');
    expect(await field('Sender address')).toHaveAttribute('aria-invalid', 'true');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('shows the error of the relay when the test mail fails', async () => {
    setUp({ relay: { ...RELAY, host: 'relay.invalid' }, defaultHost: '' });
    repository.sendTest.mockResolvedValue({
      accepted: false,
      host: 'relay.invalid',
      error: 'Connection error: Connection refused (os error 111)',
    });
    const user = userEvent.setup();

    await user.type(await field('Send to'), 'admin@scylla.example');
    await user.click(screen.getByRole('button', { name: 'Send a test mail' }));

    const result = await screen.findByRole('status');
    expect(within(result).getByText('The mail was not sent')).toBeInTheDocument();
    expect(within(result).getByText(/Connection refused/)).toBeInTheDocument();
    expect(repository.sendTest).toHaveBeenCalledWith('admin@scylla.example');
  });

  it('shows the answer of the relay when it accepts the test mail', async () => {
    setUp({ relay: RELAY, defaultHost: '' });
    repository.sendTest.mockResolvedValue({
      accepted: true,
      host: 'smtp-relay.brevo.com',
      reply: '250 2.0.0 OK: queued as Q7',
      messageId: 'Q7',
    });
    const user = userEvent.setup();

    await user.type(await field('Send to'), 'admin@scylla.example');
    await user.click(screen.getByRole('button', { name: 'Send a test mail' }));

    const result = await screen.findByRole('status');
    expect(within(result).getByText('The mail server accepted the mail')).toBeInTheDocument();
    expect(within(result).getByText('250 2.0.0 OK: queued as Q7')).toBeInTheDocument();
    expect(within(result).getByText('Q7')).toBeInTheDocument();
  });

  it('locks the test mail when the server has no mail server', async () => {
    setUp({ relay: null, defaultHost: '' });

    expect(await field('Send to')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send a test mail' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Use the server default' })).toBeNull();
  });

  it('goes back to the server default after a confirmation', async () => {
    setUp({ relay: RELAY, defaultHost: 'smtp.default.example' });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Use the server default' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(repository.reset).not.toHaveBeenCalled();
    await user.click(within(confirm).getByRole('button', { name: 'Use the server default' }));

    await waitFor(() => expect(repository.reset).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(
        /Scylla uses the mail server of its configuration: smtp.default.example/,
      ),
    ).toBeInTheDocument();
    expect(await field('Host')).toHaveValue('');
  });
});

describe('MailSettingsPage without the right', () => {
  it('locks the form, the test mail and the reset', async () => {
    setUp(
      { relay: RELAY, defaultHost: '' },
      {
        kind: 'restricted',
        permissions: [Permission.READ_USER],
      },
    );

    expect(await field('Host')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send a test mail' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Use the server default' })).toBeDisabled();
  });
});
