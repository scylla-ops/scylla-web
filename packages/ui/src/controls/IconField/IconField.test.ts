import { describe, it, expect, onTestFinished, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render } from '@test/render.ts';
import IconFieldFixture from './IconField.fixture.svelte';
import IconFieldDialogFixture from './IconFieldDialog.fixture.svelte';

const field = () => screen.getByRole('group', { name: 'Icon' });
const change = () => within(field()).getByRole('button', { name: 'Change the icon' });
const editor = () => screen.getByRole('region', { name: 'Icon' });
const back = () => within(editor()).getByRole('button', { name: 'Back' });
/** The main screen: `inert` while the editor shows. */
const mainScreen = () => document.querySelector('[data-screen="main"] > div') as HTMLElement;

describe('IconField', () => {
  it('shows the default icon, large and centered, with Reset off', () => {
    render(IconFieldFixture, {});

    expect(field()).toHaveClass('items-center');
    const preview = field().querySelector('[data-slot="entity-icon"]');
    expect(preview).toHaveClass('size-18');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(within(field()).getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('opens the editor on a second screen, with Back, and gives it the focus', async () => {
    render(IconFieldFixture, {});

    await userEvent.click(change());

    expect(within(editor()).getByRole('searchbox')).toBeVisible();
    expect(within(editor()).getByRole('button', { name: 'Free color' })).toBeVisible();
    expect(within(editor()).getByRole('tab', { name: 'Image' })).toBeVisible();
    expect(back()).toHaveFocus();
    expect(mainScreen().inert).toBe(true);
    // The field keeps the preview and Reset: the editor does not show them a second time.
    expect(screen.getAllByRole('button', { name: 'Reset' })).toHaveLength(1);
  });

  it('gives each choice to its owner and submits no form', async () => {
    const onchange = vi.fn();
    const onsubmit = vi.fn();
    render(IconFieldFixture, { onchange, onsubmit });

    await userEvent.click(change());
    await userEvent.click(screen.getByRole('button', { name: 'rocket' }));
    await userEvent.click(screen.getByRole('button', { name: 'Color 2' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Image' }));
    await userEvent.click(screen.getByRole('button', { name: 'browse' }));

    expect(onchange).toHaveBeenLastCalledWith({ kind: 'glyph', name: 'rocket', color: 'chart-2' });
    expect(onsubmit).not.toHaveBeenCalled();
  });

  it('keeps the choice at Back, and gives the focus back to Change the icon', async () => {
    render(IconFieldFixture, {});

    await userEvent.click(change());
    await userEvent.click(screen.getByRole('button', { name: 'rocket' }));
    await userEvent.click(back());

    await waitFor(() => expect(change()).toHaveFocus());
    expect(mainScreen().inert).toBe(false);
    expect(within(field()).getByRole('button', { name: 'Reset' })).toBeEnabled();
  });

  it('goes back on Escape', async () => {
    render(IconFieldFixture, {});

    await userEvent.click(change());
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(change()).toHaveFocus());
    expect(mainScreen().inert).toBe(false);
  });

  it('keeps the URL of a new image in the field, after the editor goes away', async () => {
    const { createObjectURL: create, revokeObjectURL: revoke } = URL;
    const createObjectURL = vi.fn(() => 'blob:field');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    onTestFinished(() => {
      Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    });
    const onchange = vi.fn();
    const view = render(IconFieldFixture, { onchange });

    await userEvent.click(change());
    await userEvent.click(screen.getByRole('tab', { name: 'Image' }));
    const file = new File([new Uint8Array([1])], 'logo.png', { type: 'image/png' });
    const input = editor().querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(onchange).toHaveBeenLastCalledWith({ kind: 'image', url: 'blob:field', file });
    expect(field().querySelector('img')).toHaveAttribute('src', 'blob:field');
    await userEvent.click(back());
    expect(field().querySelector('img')).toHaveAttribute('src', 'blob:field');
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:field');
  });

  it('puts back the default icon, and the editor starts again on the default glyph', async () => {
    const onchange = vi.fn();
    render(IconFieldFixture, {
      initial: { kind: 'glyph', name: 'rocket', color: '#e879f9' },
      onchange,
    });

    await userEvent.click(within(field()).getByRole('button', { name: 'Reset' }));
    expect(onchange).toHaveBeenLastCalledWith({ kind: 'default' });
    await userEvent.click(change());
    expect(screen.getByRole('button', { name: 'bot' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Color 3' }));
    expect(onchange).toHaveBeenLastCalledWith({ kind: 'glyph', name: 'bot', color: 'chart-3' });
  });

  it('cannot change while it is disabled', () => {
    render(IconFieldFixture, {
      initial: { kind: 'glyph', name: 'rocket', color: 'chart-2' },
      disabled: true,
    });

    expect(change()).toBeDisabled();
    expect(within(field()).getByRole('button', { name: 'Reset' })).toBeDisabled();
  });
});

describe('IconField in a dialog with screens', () => {
  it('slides the whole dialog to the editor, and keeps the form and the choice at Back', async () => {
    const onsave = vi.fn();
    render(IconFieldDialogFixture, { onsave });
    await focusSettled();
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'acme');

    await userEvent.click(change());

    // The title of the dialog and the form are on the main screen, under the editor.
    expect(mainScreen()).toContainElement(screen.getByText('Edit workspace'));
    expect(mainScreen().inert).toBe(true);
    await userEvent.click(within(editor()).getByRole('button', { name: 'rocket' }));
    await userEvent.click(back());

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('acme');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onsave).toHaveBeenCalledWith({ kind: 'glyph', name: 'rocket', color: 'primary' });
  });

  it('goes back on Escape first, and closes on the next Escape', async () => {
    render(IconFieldDialogFixture, {});
    await focusSettled();

    await userEvent.click(change());
    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(change()).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('the Avatar tab of IconField', () => {
  it('shows only for a person or an App', async () => {
    render(IconFieldFixture, {});

    await userEvent.click(change());

    expect(screen.queryByRole('tab', { name: 'Avatar' })).not.toBeInTheDocument();
  });

  it('gives a glyph avatar with explicit values, and the preview shows it', async () => {
    const onchange = vi.fn();
    render(IconFieldFixture, { onchange, avatar: true });

    await userEvent.click(change());
    await userEvent.click(screen.getByRole('tab', { name: 'Avatar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Scylla head' }));

    expect(onchange).toHaveBeenLastCalledWith({
      kind: 'avatar',
      avatar: expect.objectContaining({ shape: 'scylla', flip: 'none', rotate: 0, scale: 100 }),
    });
    const preview = field().querySelector<HTMLImageElement>('[data-slot="icon-preview"] img');
    expect(preview?.src.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('opens on the avatar of an App that has one', async () => {
    const avatar = {
      shape: 'variant05',
      glyph: { colors: ['#ffffff'], fill: 'solid', angle: 0 },
      background: { colors: ['#4338ca'], fill: 'solid', angle: 0 },
      flip: 'none',
      rotate: 0,
      scale: 100,
    } as const;
    render(IconFieldFixture, { initial: { kind: 'avatar', avatar }, avatar: true });

    await userEvent.click(change());

    expect(screen.getByRole('tab', { name: 'Avatar' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Shape 5' })).toHaveAttribute('aria-pressed', 'true');
  });
});
