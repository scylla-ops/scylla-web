import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { EMPTY_OPERATOR, withLegalRepository, type LegalDocument } from '@platform/legal';
import type { TermsStatus } from '@base/features/login';
import AccountPrivacy from './AccountPrivacy.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const COPY = {
  json: '{"format":"scylla.account-data.v1"}',
  exportedAt: '2026-11-20T14:05:00.000Z',
};

const TERMS: LegalDocument = {
  kind: 'terms',
  title: '',
  content: { type: 'markdown', markdown: '# Terms' },
  version: '1.0',
  effectiveDate: null,
  acceptanceRequired: true,
  updatedAt: null,
};

const NOTHING_ACCEPTED: TermsStatus = {
  acceptanceRequired: false,
  accepted: null,
  displayName: 'Ada',
  email: 'ada@example.com',
};

let teardown: Array<() => void> = [];
let exportAccountData: ReturnType<typeof vi.fn>;
let termsStatus: ReturnType<typeof vi.fn>;
let createObjectURL: ReturnType<typeof vi.fn>;
let click: MockInstance<HTMLAnchorElement['click']>;

beforeEach(() => {
  exportAccountData = vi.fn().mockResolvedValue(COPY);
  createObjectURL = vi.fn(() => 'blob:copy');
  Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
  click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  termsStatus = vi.fn().mockResolvedValue(NOTHING_ACCEPTED);
  const info = vi.fn().mockResolvedValue({
    operator: EMPTY_OPERATOR,
    privacyContact: '',
    documents: [TERMS],
  });
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withLegalRepository({ info, update: vi.fn() }),
    withRegistry({
      user: { userRepository: { exportAccountData } },
      login: { loginRepository: { termsStatus } },
    }),
  ];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  click.mockRestore();
});

/** The names of the files that the page gave to the browser. */
const savedFiles = () => click.mock.contexts.map(link => (link as HTMLAnchorElement).download);

describe('AccountPrivacy', () => {
  it('offers the export before the first copy', () => {
    render(AccountPrivacy);

    expect(screen.getByText('No export yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download my data' })).toBeEnabled();
  });

  it('saves the copy as a JSON file named after its day, and shows it as ready', async () => {
    render(AccountPrivacy);

    await userEvent.click(screen.getByRole('button', { name: 'Download my data' }));

    expect(await screen.findByText('Your file is ready')).toBeInTheDocument();
    expect(
      screen.getByText(/^scylla-account-data-2026-11-20\.json · [\d.]+ kB · Made on /),
    ).toBeInTheDocument();
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(savedFiles()).toEqual(['scylla-account-data-2026-11-20.json']);
  });

  it('saves the same copy again with Download, and asks for a new one with New export', async () => {
    render(AccountPrivacy);
    await userEvent.click(screen.getByRole('button', { name: 'Download my data' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Download' }));
    expect(exportAccountData).toHaveBeenCalledTimes(1);
    expect(savedFiles()).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'New export' }));
    await vi.waitFor(() => expect(savedFiles()).toHaveLength(3));
    expect(exportAccountData).toHaveBeenCalledTimes(2);
  });

  it('shows the preparation while the server makes the copy', async () => {
    exportAccountData.mockReturnValue(new Promise(() => {}));
    render(AccountPrivacy);

    await userEvent.click(screen.getByRole('button', { name: 'Download my data' }));

    expect(await screen.findByText('Preparing your file')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preparing…' })).toBeDisabled();
  });

  it('says that the export failed, and tries again', async () => {
    exportAccountData.mockRejectedValueOnce(new ScyllaError('down', { code: 'UNAVAILABLE' }));
    render(AccountPrivacy);

    await userEvent.click(screen.getByRole('button', { name: 'Download my data' }));

    expect(await screen.findByText('The export failed')).toBeInTheDocument();
    expect(savedFiles()).toEqual([]);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Your file is ready')).toBeInTheDocument();
  });

  it('links to the privacy policy, to the cookie page and to the danger zone', () => {
    render(AccountPrivacy);

    expect(screen.getByRole('link', { name: 'Read the privacy policy' })).toHaveAttribute(
      'href',
      '/legal/privacy',
    );
    expect(
      screen.getByRole('link', { name: 'See what this app keeps in your browser' }),
    ).toHaveAttribute('href', '/legal/cookies');
    expect(screen.getByRole('link', { name: 'Danger zone' })).toHaveAttribute(
      'href',
      'danger-zone',
    );
  });

  it('shows the version of the terms that the user accepted, and its date', async () => {
    termsStatus.mockResolvedValue({
      ...NOTHING_ACCEPTED,
      accepted: { version: '1.0', acceptedAt: '2026-11-20T14:02:00.000Z' },
    });
    render(AccountPrivacy);

    expect(await screen.findByText('Terms of service · version 1.0')).toBeInTheDocument();
    expect(screen.getByText(/^Accepted on .*2026/)).toBeInTheDocument();
    const read = await screen.findByRole('link', { name: 'Read' });
    expect(read).toHaveAttribute('href', '/legal/terms');
    expect(read).toHaveAttribute('target', '_blank');
  });

  it('shows no terms before a first acceptance', async () => {
    render(AccountPrivacy);

    await vi.waitFor(() => expect(termsStatus).toHaveBeenCalled());
    expect(screen.queryByText(/Terms of service/)).not.toBeInTheDocument();
  });
});
