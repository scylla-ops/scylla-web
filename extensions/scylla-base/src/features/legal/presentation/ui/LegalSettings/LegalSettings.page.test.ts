import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import {
  EMPTY_OPERATOR,
  withLegalRepository,
  type LegalInfo,
  type LegalRepository,
} from '@platform/legal';
import { findFloating, render, withQueryClient } from '@test/render.ts';
import LegalSettingsPage from './LegalSettings.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let teardown: Array<() => void> = [];
let update: Mock<LegalRepository['update']>;

const info: LegalInfo = {
  operator: { ...EMPTY_OPERATOR, name: 'Acme SAS' },
  privacyContact: '',
  documents: [
    {
      kind: 'terms',
      title: '',
      content: { type: 'markdown', markdown: '# Terms' },
      version: '1.0',
      effectiveDate: null,
      acceptanceRequired: false,
      changes: '',
      updatedAt: null,
    },
  ],
};

const setUp = () => {
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  } as never);
  update = vi.fn<LegalRepository['update']>().mockResolvedValue(info);
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withLegalRepository({ info: vi.fn().mockResolvedValue(info), update }),
  ];
  render(LegalSettingsPage);
};

const rowOf = async (title: string) =>
  (await screen.findByText(title, { selector: 'p' })).closest('li') as HTMLElement;

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('LegalSettingsPage', () => {
  it('turns a document into a link to a page of the operator', async () => {
    setUp();
    const user = userEvent.setup();
    const row = await rowOf('Privacy policy');

    await user.click(within(row).getByRole('combobox', { name: 'Content of Privacy policy' }));
    await user.click(await findFloating('option', 'Link'));
    await user.type(
      within(row).getByLabelText('Address of the page'),
      'https://acme.example/privacy',
    );
    // Only the terms ask an acceptance: no list of what changes.
    expect(within(row).queryByLabelText('What changes')).not.toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        documents: [
          {
            kind: 'privacy',
            title: '',
            content: { type: 'url', url: 'https://acme.example/privacy' },
            version: '',
            effectiveDate: '',
            acceptanceRequired: false,
            changes: '',
          },
        ],
      }),
    );
  });

  it('publishes a new version of the terms that users must accept', async () => {
    setUp();
    const user = userEvent.setup();
    const row = await rowOf('Terms of service');

    const version = within(row).getByLabelText('Version');
    await user.clear(version);
    await user.type(version, '2.0');
    await user.type(within(row).getByLabelText('What changes'), 'Export of your data. ');
    await user.click(
      within(row).getByRole('switch', { name: 'Users must accept this version again' }),
    );
    await user.click(within(row).getByRole('button', { name: 'Publish version 2.0' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        documents: [
          expect.objectContaining({
            kind: 'terms',
            version: '2.0',
            acceptanceRequired: true,
            changes: 'Export of your data.',
          }),
        ],
      }),
    );
  });

  it('saves the operator, and shows the banner as off while every tracker is exempt', async () => {
    setUp();
    const user = userEvent.setup();

    const contact = await screen.findByLabelText('Contact');
    await user.type(contact, 'legal@acme.example');
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        operator: { ...EMPTY_OPERATOR, name: 'Acme SAS', contact: 'legal@acme.example' },
      }),
    );
    expect(
      screen.getByText(
        /No tracker needs consent: the registry lists \d+ strictly necessary items\./,
      ),
    ).toBeInTheDocument();
  });
});
