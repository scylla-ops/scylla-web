import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.ts';
import { serviceStatus } from '@platform/grpc';
import ServiceBanner from './ServiceBanner.svelte';

afterEach(() => {
  serviceStatus.unavailable = false;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ServiceBanner', () => {
  it('shows nothing while the service answers', () => {
    render(ServiceBanner);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows one banner in an outage, and reloads the page when the API answers again', async () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('<html>', { headers: { 'content-type': 'text/html' } }))
      .mockResolvedValue(
        new Response(null, { headers: { 'content-type': 'application/grpc-web+proto' } }),
      );
    vi.stubGlobal('fetch', fetch);
    serviceStatus.unavailable = true;
    render(ServiceBanner);

    expect(await screen.findByRole('alert')).toHaveTextContent(/service unavailable/i);

    await vi.advanceTimersByTimeAsync(5000);
    expect(reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(reload).toHaveBeenCalledOnce();
  });
});
