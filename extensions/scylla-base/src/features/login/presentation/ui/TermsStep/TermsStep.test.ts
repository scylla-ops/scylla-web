import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { LegalInfo } from '@platform/legal';
import type { TermsStatus } from '@base/features/login/domain/structs/terms-status.struct.ts';
import { TERMS_STATUS_QUERY_KEY } from '@base/features/login/presentation/login.queries.ts';
import { termsToAcceptAt, withLegalInfo } from '../../__test__/legal-info.fixture.ts';
import TermsStep from './TermsStep.svelte';

const signOut = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@base/features/login/presentation/sign-out.ts', () => ({ signOut }));

const onDecline = vi.fn();

const FIRST: TermsStatus = {
  acceptanceRequired: true,
  accepted: null,
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
};

const UPDATE: TermsStatus = {
  ...FIRST,
  accepted: { version: '1.0', acceptedAt: '2026-01-10T09:00:00.000Z' },
};

let teardown: Array<() => void> = [];

afterEach(() => {
  teardown.forEach(restore => restore());
  signOut.mockClear();
  onDecline.mockClear();
});

const open = (status: TermsStatus, ...legal: [LegalInfo, ...LegalInfo[]]) => {
  const acceptTerms = vi
    .fn()
    .mockImplementation((version: string) => Promise.resolve({ version, acceptedAt: '' }));
  const termsStatus = vi.fn().mockResolvedValue({ ...status, acceptanceRequired: false });
  const cache = withQueryClient();
  cache.queryClient.setQueryData(TERMS_STATUS_QUERY_KEY(), status);
  const served = withLegalInfo(...legal);
  teardown = [
    cache.restore,
    served.restore,
    withRegistry({ login: { loginRepository: { acceptTerms, termsStatus } } }),
  ];
  render(TermsStep, { status, onDecline });
  return { acceptTerms, queryClient: cache.queryClient, readLegalInfo: served.info };
};

describe('TermsStep', () => {
  it('asks a first acceptance, with the account of the session', async () => {
    open(FIRST, termsToAcceptAt('2.0'));

    expect(screen.getByRole('heading', { name: 'One last step' })).toBeInTheDocument();
    expect(screen.getByText('Signed in as')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace · ada@example.com')).toBeInTheDocument();
    const box = await screen.findByRole('checkbox', { name: 'I accept the Terms of service' });
    expect(box).not.toBeChecked();
    // In the sentence that asks to read them, and in the label of the box.
    for (const link of screen.getAllByRole('link', { name: 'Terms of service' })) {
      expect(link).toHaveAttribute('href', '/legal/terms');
      expect(link).toHaveAttribute('target', '_blank');
    }
    expect(screen.getByText(/before you accept/)).toHaveTextContent(
      'Read the Terms of service and the Privacy policy before you accept.',
    );
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/legal/privacy',
    );
  });

  it('accepts the current version once the box is ticked, and lets the app show', async () => {
    const { acceptTerms, queryClient } = open(FIRST, termsToAcceptAt('2.0'));
    const user = userEvent.setup();
    const accept = screen.getByRole('button', { name: 'Accept and continue' });

    expect(accept).toBeDisabled();
    await user.click(
      await screen.findByRole('checkbox', { name: 'I accept the Terms of service' }),
    );
    await user.click(accept);

    await waitFor(() => expect(acceptTerms).toHaveBeenCalledWith('2.0'));
    await waitFor(() =>
      expect(queryClient.getQueryData<TermsStatus>(TERMS_STATUS_QUERY_KEY())).toMatchObject({
        acceptanceRequired: false,
      }),
    );
  });

  it('tells what changed for a new version: the version and the date of effect', async () => {
    open(UPDATE, termsToAcceptAt('2.0', '2027-01-01'));

    expect(screen.getByRole('heading', { name: 'New terms of service' })).toBeInTheDocument();
    expect(await screen.findByText('Version 2.0')).toBeInTheDocument();
    expect(screen.getByText(/^Takes effect on .*2027/)).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'I accept the Terms of service, version 2.0' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Signed in as')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'What changes' })).not.toBeInTheDocument();
  });

  it('lists what changes in a new version, one item for each line', async () => {
    open(UPDATE, termsToAcceptAt('2.0', null, '- Export of your data.\n \n• Clearer rules.'));

    const changes = await screen.findByRole('region', { name: 'What changes' });
    expect(
      within(changes)
        .getAllByRole('listitem')
        .map(item => item.textContent),
    ).toEqual(['Export of your data.', 'Clearer rules.']);
  });

  it('shows no list of changes at a first acceptance', async () => {
    open(FIRST, termsToAcceptAt('2.0', null, 'Export of your data.'));

    await screen.findByRole('checkbox', { name: 'I accept the Terms of service' });
    expect(screen.queryByText('What changes')).not.toBeInTheDocument();
    expect(screen.queryByText('Export of your data.')).not.toBeInTheDocument();
  });

  it('unticks the box and reads the terms again when they changed', async () => {
    const { acceptTerms, readLegalInfo } = open(
      FIRST,
      termsToAcceptAt('2.0'),
      termsToAcceptAt('3.0'),
    );
    acceptTerms.mockRejectedValueOnce(
      new ScyllaError('refused', {
        code: 'FAILED_PRECONDITION',
        reason: 'TERMS_NOT_ACCEPTED',
        metadata: { version: '3.0' },
      }),
    );
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('checkbox', { name: 'I accept the Terms of service' }),
    );
    await user.click(screen.getByRole('button', { name: 'Accept and continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The terms changed (version 3.0). Read them and tick the box again.',
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await waitFor(() => expect(readLegalInfo).toHaveBeenCalledTimes(2));
  });

  it('signs out', async () => {
    open(FIRST, termsToAcceptAt('2.0'));

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(signOut).toHaveBeenCalledOnce();
  });

  it('lets a person who refuses the new terms delete the account, and keeps the sign-out', async () => {
    open(UPDATE, termsToAcceptAt('2.0'));

    await userEvent.click(screen.getByRole('button', { name: 'Decline and delete my account' }));

    expect(onDecline).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });
});
