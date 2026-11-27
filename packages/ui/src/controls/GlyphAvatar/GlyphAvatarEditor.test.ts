import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import { SCYLLA_GLYPH_AVATAR } from '../../structs/glyph-avatar.struct.ts';
import GlyphAvatarEditor from './GlyphAvatarEditor.svelte';

describe('GlyphAvatarEditor', () => {
  it('shows the preview, the shapes, the colors and More with its preview', () => {
    render(GlyphAvatarEditor, { value: SCYLLA_GLYPH_AVATAR, onchange: vi.fn() });

    expect(screen.getByRole('img', { name: 'Preview of the avatar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scylla head' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Figure color')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('has no Reset and the same sections with no preview', async () => {
    const onchange = vi.fn();
    render(GlyphAvatarEditor, { value: SCYLLA_GLYPH_AVATAR, onchange, preview: false });

    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    expect(screen.getByText('Figure color')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Shape 1' }));
    expect(onchange).toHaveBeenCalled();
  });
});
