import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.svelte.ts';
import { withLocale } from '@test/i18n.ts';
import { messages } from '../../../../locales/fr/messages.ts';
import type { UserSessionEntity } from '../../../../domain/entities/user-session.entity.ts';
import SessionRow from './SessionRow.svelte';

/** Two placeholders in the title, and a relative time in the active locale. */
withLocale('fr', messages);

const NOW = Date.parse('2026-10-09T12:00:00.000Z');
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

const session = (overrides: Partial<UserSessionEntity> = {}): UserSessionEntity => ({
  sessionId: 'session-2',
  createdAt: minutesAgo(600),
  lastActiveAt: minutesAgo(1),
  expiresAt: minutesAgo(-600),
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  ipAddress: '203.0.113.7',
  current: false,
  ...overrides,
});

const show = (overrides: Partial<UserSessionEntity> = {}) =>
  render(SessionRow, { session: session(overrides), now: NOW, canRevoke: true, onRevoke: vi.fn() });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SessionRow in French', () => {
  it('puts the browser and the system in the French order, with the button named after them', () => {
    show();

    expect(screen.getByText('Chrome sur macOS')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.7 · Active maintenant')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Se déconnecter de Chrome sur macOS' }),
    ).toHaveTextContent('Se déconnecter');
  });

  it('gives the time since the last activity in French', () => {
    show({ lastActiveAt: minutesAgo(180) });

    const relative = new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: 'short' })
      .format(-3, 'hour')
      .replace(/\s+/g, ' ');
    expect(screen.getByText(`203.0.113.7 · Dernière activité ${relative}`)).toBeInTheDocument();
  });

  it('translates the API client, the unknown device and the current session', () => {
    show({ userAgent: 'curl/8.7.1', current: true });
    expect(screen.getByText('curl')).toBeInTheDocument();
    expect(screen.getByText('Client API · 203.0.113.7 · Active maintenant')).toBeInTheDocument();
    expect(screen.getByText('Cette session')).toBeInTheDocument();

    show({ userAgent: '', sessionId: 'session-3' });
    expect(screen.getByText('Appareil inconnu')).toBeInTheDocument();
  });
});
