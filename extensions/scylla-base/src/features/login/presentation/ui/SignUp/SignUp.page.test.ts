import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import type { LegalInfo } from '@platform/legal';
import {
  legalDocument,
  legalInfo,
  termsToAcceptAt,
  withLegalInfo,
} from '../../__test__/legal-info.fixture.ts';
import SignUpPage from './SignUp.page.svelte';

let teardown: Array<() => void> = [];
let signUp: ReturnType<typeof vi.fn>;

let readLegalInfo: ReturnType<typeof withLegalInfo>['info'];

/** Opens the page. `legal`: the legal settings of each read; none by default. */
const openAt = async (url: string, ...legal: LegalInfo[]) => {
  history.replaceState(null, '', url);
  signUp = vi.fn().mockResolvedValue(undefined);
  const cache = withQueryClient();
  const served = withLegalInfo(legal[0] ?? legalInfo(), ...legal.slice(1));
  readLegalInfo = served.info;
  teardown = [
    cache.restore,
    served.restore,
    withRegistry({ login: { loginRepository: { signUp } } }),
  ];
  render(SignUpPage);
  await focusSettled();
};

afterEach(() => {
  teardown.forEach(restore => restore());
  history.replaceState(null, '', '/');
});

const type = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Name'), '  Ada Lovelace ');
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'correct horse');
  await user.type(screen.getByLabelText('Confirm the password'), 'correct horse');
  return user;
};

const fill = async () => {
  const user = await type();
  await user.click(screen.getByRole('button', { name: 'Create the account' }));
};

const termsBox = () => screen.findByRole('checkbox', { name: 'I accept the Terms of service' });

describe('SignUpPage', () => {
  it('sends the trimmed name and the email, then says that a mail was sent', async () => {
    await openAt('/sign-up');

    await fill();

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith({
        email: 'ada@example.com',
        password: 'correct horse',
        displayName: 'Ada Lovelace',
        invitationToken: '',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('We sent a link to this address');
  });

  it('sends the invitation of the link, and takes it out of the address bar', async () => {
    await openAt('/sign-up#invitation=inv-42');
    expect(window.location.hash).toBe('');

    await fill();

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ invitationToken: 'inv-42' })),
    );
  });

  describe('when the terms need an acceptance', () => {
    it('keeps the form until the person ticks the box, then sends the version', async () => {
      await openAt('/sign-up', termsToAcceptAt('2.0'));
      const box = await termsBox();
      const user = await type();
      const submit = screen.getByRole('button', { name: 'Create the account' });

      expect(box).not.toBeChecked();
      expect(submit).toBeDisabled();

      await user.click(box);
      await user.click(submit);

      await waitFor(() =>
        expect(signUp).toHaveBeenCalledWith(
          expect.objectContaining({ acceptedTermsVersion: '2.0' }),
        ),
      );
      expect(await screen.findByRole('status')).toHaveTextContent('We sent a link to this address');
    });

    it('links the terms and the privacy policy in a new tab', async () => {
      await openAt('/sign-up', termsToAcceptAt('2.0'));
      await termsBox();

      const terms = screen.getByRole('link', { name: 'Terms of service' });
      const privacy = screen.getByRole('link', { name: 'Privacy policy' });
      expect(terms).toHaveAttribute('href', '/legal/terms');
      expect(terms).toHaveAttribute('target', '_blank');
      expect(privacy).toHaveAttribute('href', '/legal/privacy');
      expect(privacy.closest('p')).toHaveTextContent(
        'We use your data to create and run your account. See the Privacy policy.',
      );
    });

    it('unticks the box and names the new version when the terms changed', async () => {
      await openAt('/sign-up', termsToAcceptAt('2.0'), termsToAcceptAt('3.0'));
      const box = await termsBox();
      const user = await type();
      signUp.mockRejectedValueOnce(
        new ScyllaError('refused', {
          code: 'FAILED_PRECONDITION',
          reason: 'TERMS_NOT_ACCEPTED',
          metadata: { version: '3.0' },
        }),
      );

      await user.click(box);
      await user.click(screen.getByRole('button', { name: 'Create the account' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The terms changed while you filled in the form (version 3.0). Read them and tick the box again.',
      );
      expect(await termsBox()).not.toBeChecked();
      expect(screen.getByRole('button', { name: 'Create the account' })).toBeDisabled();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      await waitFor(() => expect(readLegalInfo).toHaveBeenCalledTimes(2));

      await user.click(await termsBox());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Create the account' }));
      await waitFor(() =>
        expect(signUp).toHaveBeenLastCalledWith(
          expect.objectContaining({ acceptedTermsVersion: '3.0' }),
        ),
      );
    });
  });

  it('shows no box and sends no version when the terms need no acceptance', async () => {
    await openAt('/sign-up', legalInfo(legalDocument('terms', { version: '2.0' })));
    await waitFor(() => expect(readLegalInfo).toHaveBeenCalled());

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/We use your data/)).not.toBeInTheDocument();
    await fill();

    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(signUp.mock.calls[0][0]).not.toHaveProperty('acceptedTermsVersion');
  });
});
