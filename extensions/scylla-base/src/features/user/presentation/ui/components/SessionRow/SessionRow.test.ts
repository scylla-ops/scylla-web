import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.svelte.ts';
import type { UserSessionEntity } from '../../../../domain/entities/user-session.entity.ts';
import SessionRow from './SessionRow.svelte';

const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const NOW = Date.parse('2026-10-09T12:00:00.000Z');
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

const session = (overrides: Partial<UserSessionEntity> = {}): UserSessionEntity => ({
  sessionId: 'session-2',
  createdAt: minutesAgo(600),
  lastActiveAt: minutesAgo(1),
  expiresAt: minutesAgo(-600),
  userAgent: CHROME_MAC,
  ipAddress: '203.0.113.7',
  current: false,
  ...overrides,
});

const show = (
  props: Partial<{
    session: UserSessionEntity;
    canRevoke: boolean;
    disabled: boolean;
    onRevoke: (sessionId: string) => void;
  }> = {},
) =>
  render(SessionRow, {
    session: session(),
    now: NOW,
    canRevoke: true,
    onRevoke: vi.fn(),
    ...props,
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const kind = (container: HTMLElement) =>
  container.querySelector('[data-kind]')?.getAttribute('data-kind');

describe('SessionRow', () => {
  it('names the browser and the system, and shows a desktop icon', () => {
    const { container } = show();

    expect(screen.getByText('Chrome on macOS')).toBeInTheDocument();
    expect(kind(container)).toBe('desktop');
  });

  it('shows a phone icon for a mobile browser', () => {
    const { container } = show({ session: session({ userAgent: SAFARI_IPHONE }) });

    expect(screen.getByText('Safari on iOS')).toBeInTheDocument();
    expect(kind(container)).toBe('mobile');
  });

  it('names an API client and shows a terminal icon', () => {
    const { container } = show({ session: session({ userAgent: 'grpc-python/1.66.1' }) });

    expect(screen.getByText('gRPC Python')).toBeInTheDocument();
    expect(screen.getByText('API client · 203.0.113.7 · Active now')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out gRPC Python' })).toBeInTheDocument();
    expect(kind(container)).toBe('api');
  });

  it('shows an empty user agent as an unknown device, with a neutral icon and no API client prefix', () => {
    const { container } = show({ session: session({ userAgent: '  ' }) });

    expect(screen.getByText('Unknown device')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.7 · Active now')).toBeInTheDocument();
    expect(kind(container)).toBe('unknown');
  });

  it('says the session is active now when the last activity is less than five minutes old', () => {
    show({ session: session({ lastActiveAt: minutesAgo(4) }) });

    expect(screen.getByText('203.0.113.7 · Active now')).toBeInTheDocument();
  });

  it('gives the time since the last activity after five minutes', () => {
    show({ session: session({ lastActiveAt: minutesAgo(180) }) });

    const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' })
      .format(-3, 'hour')
      .replace(/\s+/g, ' ');
    expect(screen.getByText(`203.0.113.7 · Last active ${relative}`)).toBeInTheDocument();
  });

  it('leaves out the IP address and the dot when the IP address is not known', () => {
    show({ session: session({ ipAddress: '' }) });

    expect(screen.getByText('Active now')).toBeInTheDocument();
  });

  it('marks the current session and gives it no sign-out button', () => {
    show({ session: session({ current: true }) });

    expect(screen.getByText('This session')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('signs out another session, with a button named after the device', async () => {
    const onRevoke = vi.fn();
    show({ onRevoke });

    expect(screen.queryByText('This session')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Sign out Chrome on macOS' });
    expect(button).toHaveTextContent('Sign out');
    await userEvent.click(button);

    expect(onRevoke).toHaveBeenCalledWith('session-2');
  });

  it('shows no sign-out button to a viewer who may not revoke', () => {
    show({ canRevoke: false });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('disables the button while a revocation runs', () => {
    show({ disabled: true });

    expect(screen.getByRole('button', { name: 'Sign out Chrome on macOS' })).toBeDisabled();
  });
});
