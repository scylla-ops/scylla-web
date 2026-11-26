import { describe, it, expect, onTestFinished, vi } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import IconFieldFixture from './IconField.fixture.svelte';

const field = () => screen.getByRole('group', { name: 'Icon' });
const toggle = () => within(field()).getByRole('button', { name: 'Change the icon' });

describe('IconField', () => {
  it('shows the default icon with the picker closed and Reset off', () => {
    render(IconFieldFixture, {});

    expect(field().querySelector('[data-slot="entity-icon"]')).not.toBeNull();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(within(field()).getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('opens the picker of the glyphs, the colors and the image under the preview', async () => {
    render(IconFieldFixture, {});

    await userEvent.click(toggle());

    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('searchbox')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Free color' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Image' })).toBeVisible();
    // The field shows the preview and Reset: the picker does not show them a second time.
    expect(screen.getAllByRole('button', { name: 'Reset' })).toHaveLength(1);
  });

  it('gives each choice to its owner and submits no form', async () => {
    const onchange = vi.fn();
    const onsubmit = vi.fn();
    render(IconFieldFixture, { onchange, onsubmit });

    await userEvent.click(toggle());
    await userEvent.click(screen.getByRole('button', { name: 'rocket' }));
    await userEvent.click(screen.getByRole('button', { name: 'Color 2' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Image' }));
    await userEvent.click(screen.getByRole('button', { name: 'browse' }));

    expect(onchange).toHaveBeenLastCalledWith({ kind: 'glyph', name: 'rocket', color: 'chart-2' });
    expect(onsubmit).not.toHaveBeenCalled();
  });

  it('keeps the choice when the picker closes', async () => {
    render(IconFieldFixture, {});

    await userEvent.click(toggle());
    await userEvent.click(screen.getByRole('button', { name: 'rocket' }));
    await userEvent.click(toggle());

    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(toggle()).not.toHaveAttribute('aria-controls');
    expect(within(field()).getByRole('button', { name: 'Reset' })).toBeEnabled();
  });

  it('keeps the URL of a new image in the field, after the picker goes away', async () => {
    const { createObjectURL: create, revokeObjectURL: revoke } = URL;
    const createObjectURL = vi.fn(() => 'blob:field');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    onTestFinished(() => {
      Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    });
    const onchange = vi.fn();
    const view = render(IconFieldFixture, { onchange });

    await userEvent.click(toggle());
    await userEvent.click(screen.getByRole('tab', { name: 'Image' }));
    const file = new File([new Uint8Array([1])], 'logo.png', { type: 'image/png' });
    const input = field().querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(onchange).toHaveBeenLastCalledWith({ kind: 'image', url: 'blob:field', file });
    expect(field().querySelector('img')).toHaveAttribute('src', 'blob:field');
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:field');
  });

  it('puts back the default icon, and the picker starts again on the default glyph', async () => {
    const onchange = vi.fn();
    render(IconFieldFixture, {
      initial: { kind: 'glyph', name: 'rocket', color: '#e879f9' },
      onchange,
    });

    await userEvent.click(toggle());
    await userEvent.click(within(field()).getByRole('button', { name: 'Reset' }));
    expect(onchange).toHaveBeenLastCalledWith({ kind: 'default' });
    expect(screen.getByRole('button', { name: 'bot' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Color 3' }));
    expect(onchange).toHaveBeenLastCalledWith({ kind: 'glyph', name: 'bot', color: 'chart-3' });
  });

  it('cannot change while it is disabled', () => {
    render(IconFieldFixture, {
      initial: { kind: 'glyph', name: 'rocket', color: 'chart-2' },
      disabled: true,
    });

    expect(toggle()).toBeDisabled();
    expect(within(field()).getByRole('button', { name: 'Reset' })).toBeDisabled();
  });
});
