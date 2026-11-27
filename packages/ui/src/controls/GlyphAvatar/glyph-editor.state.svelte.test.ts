import { describe, expect, it, vi } from 'vitest';
import { SCYLLA_GLYPH_AVATAR, type GlyphAvatar } from '../../structs/glyph-avatar.struct.ts';
import { createGlyphEditor } from './glyph-editor.state.svelte.ts';

const editor = (start: GlyphAvatar = SCYLLA_GLYPH_AVATAR) => {
  const onchange = vi.fn();
  return { onchange, state: createGlyphEditor(() => start, onchange, () => 0) };
};

describe('createGlyphEditor', () => {
  it('gives each change to the owner, and knows that the draft changed', () => {
    const { onchange, state } = editor();

    state.shape('variant07');

    expect(state.avatar.shape).toBe('variant07');
    expect(onchange).toHaveBeenLastCalledWith({ ...SCYLLA_GLYPH_AVATAR, shape: 'variant07' });
    expect(state.changed).toBe(true);
  });

  it('goes back to the avatar of the opening with Reset', () => {
    const { state } = editor();

    state.flip('both');
    state.reset();

    expect(state.avatar).toEqual(SCYLLA_GLYPH_AVATAR);
    expect(state.changed).toBe(false);
  });

  it('keeps the rotation and the size in the ranges of the server', () => {
    const { state } = editor();

    state.rotate(400.4);
    state.scale(10);

    expect(state.avatar.rotate).toBe(360);
    expect(state.avatar.scale).toBe(50);
  });

  it('picks explicit values with Random', () => {
    const { state } = editor();

    state.random();

    expect(state.avatar.shape).toBe('variant01');
    expect(state.avatar.glyph.colors).toHaveLength(1);
    expect(state.avatar.background.fill).toBe('solid');
  });

  it('changes one paint and keeps the other', () => {
    const { state } = editor();
    const paint = { colors: ['#112233', '#445566'], fill: 'radial', angle: 0 } as const;

    state.paint('background', paint);

    expect(state.avatar.background).toEqual(paint);
    expect(state.avatar.glyph).toEqual(SCYLLA_GLYPH_AVATAR.glyph);
  });
});
