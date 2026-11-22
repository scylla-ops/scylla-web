import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { msg } from '@lingui/core/macro';
import { cookieSettings } from '@platform/consent';
import { trackersPoints } from '@platform/trackers';
import { render, withQueryClient, withWidgetInjections } from '@test/render.ts';
import { withLegalRepository } from '../../../legal-repository.ts';
import type { LegalInfo } from '../../../domain/structs/legal-info.struct.ts';
import { EMPTY_OPERATOR } from '../../../domain/structs/legal-info.struct.ts';
import LegalFooter from './LegalFooter.svelte';

let teardown: Array<() => void> = [];

const setUp = (info: LegalInfo) => {
  const info$ = vi.fn().mockResolvedValue(info);
  const cache = withQueryClient();
  teardown = [...teardown, cache.restore, withLegalRepository({ info: info$, update: vi.fn() })];
  return render(LegalFooter);
};

/** A tracker that needs consent, as an extension adds one. */
const withAnalytics = () =>
  withWidgetInjections({
    Analytics: [
      trackersPoints.trackers.patch(trackers => [
        ...trackers,
        {
          name: '_pa_id',
          type: 'cookie',
          provider: 'Acme Analytics',
          owner: 'acme',
          purpose: msg`Counts the visits.`,
          lifetime: msg`13 months`,
          exempt: false,
          consent: 'analytics',
        },
      ]),
    ],
  });

const document = (kind: LegalInfo['documents'][number]['kind'], url?: string) => ({
  kind,
  title: '',
  content: url ? { type: 'url' as const, url } : { type: 'markdown' as const, markdown: '' },
  version: '',
  effectiveDate: null,
  acceptanceRequired: false,
  changes: '',
  updatedAt: null,
});

afterEach(() => {
  teardown.forEach(restore => restore());
  teardown = [];
  cookieSettings.close();
});

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

  it('has no entry of the cookie settings while each tracker is exempt', async () => {
    setUp({ operator: { ...EMPTY_OPERATOR, name: 'Acme SAS' }, privacyContact: '', documents: [] });

    expect(await screen.findByText(/Acme SAS/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cookie settings' })).toBeNull();
  });

  it('opens the cookie settings while one tracker needs consent, with no document', async () => {
    teardown = [withAnalytics()];
    setUp({ operator: EMPTY_OPERATOR, privacyContact: '', documents: [] });

    await userEvent.click(await screen.findByRole('button', { name: 'Cookie settings' }));

    expect(cookieSettings.openFrom).toBe('preferences');
  });

  it('shows nothing while the operator set nothing', async () => {
    const { container } = setUp({ operator: EMPTY_OPERATOR, privacyContact: '', documents: [] });

    await waitFor(() => expect(container.querySelector('footer')).toBeNull());
    expect(screen.queryByRole('link')).toBeNull();
  });
});
