import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import { render, withQueryClient } from '@test/render.ts';
import { withLegalRepository } from '../../../legal-repository.ts';
import type { LegalInfo } from '../../../domain/structs/legal-info.struct.ts';
import { EMPTY_OPERATOR } from '../../../domain/structs/legal-info.struct.ts';
import LegalFooter from './LegalFooter.svelte';

let teardown: Array<() => void> = [];

const setUp = (info: LegalInfo) => {
  const info$ = vi.fn().mockResolvedValue(info);
  const cache = withQueryClient();
  teardown = [cache.restore, withLegalRepository({ info: info$, update: vi.fn() })];
  return render(LegalFooter);
};

const document = (kind: LegalInfo['documents'][number]['kind'], url?: string) => ({
  kind,
  title: '',
  content: url ? { type: 'url' as const, url } : { type: 'markdown' as const, markdown: '' },
  version: '',
  effectiveDate: null,
  acceptanceRequired: false,
  updatedAt: null,
});

afterEach(() => teardown.forEach(restore => restore()));

describe('LegalFooter', () => {
  it('links the documents that the operator turned on, and names the operator', async () => {
    setUp({
      operator: { ...EMPTY_OPERATOR, name: 'Acme SAS' },
      privacyContact: '',
      documents: [
        document('legal-notice'),
        document('privacy', 'https://acme.example/privacy'),
        document('dpa'),
      ],
    });

    const notice = await screen.findByRole('link', { name: 'Legal notice' });
    const privacy = screen.getByRole('link', { name: 'Privacy' });

    expect(notice).toHaveAttribute('href', '/legal/legal-notice');
    expect(notice).not.toHaveAttribute('target');
    expect(privacy).toHaveAttribute('href', 'https://acme.example/privacy');
    expect(privacy).toHaveAttribute('target', '_blank');
    expect(privacy).toHaveAttribute('rel', 'noopener noreferrer');
    // The DPA is not a link of the footer.
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText(`© ${new Date().getFullYear()} Acme SAS`)).toBeInTheDocument();
  });

  it('shows nothing while the operator set nothing', async () => {
    const { container } = setUp({ operator: EMPTY_OPERATOR, privacyContact: '', documents: [] });

    await waitFor(() => expect(container.querySelector('footer')).toBeNull());
    expect(screen.queryByRole('link')).toBeNull();
  });
});
