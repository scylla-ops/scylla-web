import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import * as stores from '@scylla/ui/stores';
import ThemePicker from './ThemePicker.svelte';

beforeEach(() => {
  stores.setThemePreference('dark');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ThemePicker', () => {
  it('offers Light, Dark and System, with the current choice checked', () => {
    render(ThemePicker);

    expect(screen.getByRole('radio', { name: 'Light' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'System' })).not.toBeChecked();
  });

  it('applies and stores the choice for this device', async () => {
    render(ThemePicker);

    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));

    expect(stores.getThemePreference()).toBe('light');
    expect(localStorage.getItem('scylla-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
  });

  it('starts the wave from the center of the chosen thumbnail', async () => {
    const set = vi.spyOn(stores, 'setThemePreference');
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 480,
      top: 426,
      width: 230,
      height: 128,
    } as DOMRect);
    render(ThemePicker);

    await userEvent.click(screen.getByRole('radio', { name: 'System' }));

    expect(set).toHaveBeenCalledWith('system', { x: 595, y: 490 });
  });

  it('chooses a theme from a click on its thumbnail too', async () => {
    const { container } = render(ThemePicker);
    const thumbnails = container.querySelectorAll<HTMLElement>(
      'label[data-slot="label"].aspect-video',
    );

    await userEvent.click(thumbnails[0]);

    expect(stores.getThemePreference()).toBe('light');
  });
});
