import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import { EMPTY_OPERATOR, withLegalRepository, type LegalInfo } from '@platform/legal';
import { render, withQueryClient } from '@test/render.ts';
import LegalDocumentPage from './LegalDocument.page.svelte';

let teardown: Array<() => void> = [];

const markdown = (kind: LegalInfo['documents'][number]['kind'], text: string) => ({
  kind,
  title: '',
  content: { type: 'markdown' as const, markdown: text },
  version: '1.0',
  effectiveDate: '2027-01-01',
  acceptanceRequired: false,
  changes: '',
  updatedAt: null,
});

const info: LegalInfo = {
  operator: { ...EMPTY_OPERATOR, name: 'Acme SAS', address: '1 rue de la Paix\n75002 Paris' },
  privacyContact: 'privacy@acme.example',
  documents: [
    markdown('legal-notice', ''),
    markdown(
      'privacy',
      '# Privacy policy\n\n## Who we are\n\nWe are **Acme**.\n\n### Your rights\n\nWrite to us.',
    ),
    markdown('cookies', ''),
  ],
};

const open = (kind: string) => {
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withLegalRepository({ info: vi.fn().mockResolvedValue(info), update: vi.fn() }),
  ];
  return render(LegalDocumentPage, { kind });
};

afterEach(() => teardown.forEach(restore => restore()));

describe('LegalDocumentPage', () => {
  it('shows the text with its title, its date, its version and its table of contents', async () => {
    open('privacy');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Privacy policy' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Last updated on .*2027 · Version 1\.0/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Who we are' })).toHaveAttribute(
      'id',
      'who-we-are',
    );
    expect(screen.getByText('Acme').tagName).toBe('STRONG');

    const contents = screen.getByRole('navigation', { name: 'On this page' });
    expect(
      within(contents)
        .getAllByRole('link')
        .map(link => link.getAttribute('href')),
    ).toEqual(['#who-we-are']);
    const others = screen.getByRole('navigation', { name: 'Other documents' });
    expect(within(others).getByRole('link', { name: 'Legal notice' })).toHaveAttribute(
      'href',
      '/legal/legal-notice',
    );
  });

  it('shows the operator above the text of the legal notice', async () => {
    open('legal-notice');

    expect(
      await screen.findByRole('heading', { name: 'Operator of this service' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Acme SAS', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('privacy@acme.example')).toBeInTheDocument();
  });

  it('shows the table of the trackers under the cookie policy', async () => {
    open('cookies');

    const table = await screen.findByRole('table', { name: 'Cookies and browser storage' });
    expect(within(table).getByText('__Host-scylla_session')).toBeInTheDocument();
    expect(within(table).getAllByText('Strictly necessary').length).toBeGreaterThan(1);
  });

  it('has no page for a document that is off, or for an unknown kind', async () => {
    open('terms');
    expect(
      await screen.findByRole('heading', { name: 'This document does not exist' }),
    ).toBeInTheDocument();
  });
});
