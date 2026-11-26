import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, tick } from 'svelte';
import { screen } from '@testing-library/svelte';
import { contextStore } from '@platform/context';
import { arrival } from '@base/features/login';
import { render } from '@test/render.ts';
import ShellBrand from './ShellBrand.svelte';

const logoLink = () => screen.getByRole('link', { name: 'Scylla: open the dashboard' });

afterEach(() => {
  arrival.reset();
  contextStore.getState().reset();
  vi.useRealTimers();
});

describe('ShellBrand', () => {
  it('links to the dashboard of the current workspace', () => {
    contextStore.getState().setWorkspace('w-1', 'Acme Corp', 'acme-corp');

    render(ShellBrand);

    expect(logoLink()).toHaveAttribute('href', '/acme-corp/dashboard');
  });

  it('follows a change of workspace', async () => {
    contextStore.getState().setWorkspace('w-1', 'Acme Corp', 'acme-corp');
    render(ShellBrand);

    contextStore.getState().setWorkspace('w-2', 'Globex Inc', 'globex-inc');
    await tick();

    expect(logoLink()).toHaveAttribute('href', '/globex-inc/dashboard');
  });

  it('builds the link from the name of a context saved before the slugs', () => {
    contextStore.getState().setWorkspace('w-1', 'Acme Corp');

    render(ShellBrand);

    expect(logoLink()).toHaveAttribute('href', '/acme-corp/dashboard');
  });

  it('links to the root, which picks a workspace, with no current workspace', () => {
    render(ShellBrand);

    expect(logoLink()).toHaveAttribute('href', '/');
  });

  it('shows the wordmark when the second sidebar is there', () => {
    const { container } = render(ShellBrand);

    expect(container.querySelector('[data-slot="brand-wordmark"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="brand-mark"]')).toBeNull();
    expect(container.querySelector('img')).toHaveClass('h-11');
  });

  it('shows the mark alone, centered, when only the rail column is there', () => {
    const { container } = render(ShellBrand, { collapsed: true });

    const mark = container.querySelector('[data-slot="brand-mark"]');
    expect(mark).not.toBeNull();
    expect(mark).toHaveClass('items-center', 'justify-center');
    expect(mark?.querySelector('img')).toHaveClass('size-9');
    expect(logoLink()).toHaveClass('place-items-center');
    expect(container.querySelector('[data-slot="brand-wordmark"]')).toBeNull();
  });

  it('hides the logo until the mark of the sign-in lands on it', () => {
    vi.useFakeTimers();
    vi.mocked(window.matchMedia).mockImplementation(
      query => ({ matches: query === '(min-width: 64rem)' }) as MediaQueryList,
    );
    render(ShellBrand);

    arrival.begin(() => undefined);
    vi.advanceTimersByTime(1000);
    flushSync();
    expect(logoLink()).toHaveClass('opacity-0');

    vi.advanceTimersByTime(3000 + 600);
    flushSync();
    expect(arrival.phase).toBe('arrived');
    expect(logoLink()).not.toHaveClass('opacity-0');
  });
});
