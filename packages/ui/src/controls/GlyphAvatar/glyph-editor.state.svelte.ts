import { untrack } from 'svelte';
import {
  GLYPH_SCALE,
  glyphAvatarKey,
  type GlyphAvatar,
  type GlyphFlip,
  type GlyphPaint,
} from '../../structs/glyph-avatar.struct.ts';
import { randomGlyphAvatar } from './glyph-avatar.ts';

/** The part of the figure that a paint colors. */
export type GlyphPart = 'glyph' | 'background';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * The draft of a glyph avatar in its editor. Each change gives a new avatar to `onchange`; Reset
 * goes back to the avatar of the opening, and Random picks new explicit values.
 */
export const createGlyphEditor = (
  initial: () => GlyphAvatar,
  onchange: (avatar: GlyphAvatar) => void,
  random: () => number = Math.random,
) => {
  const start = untrack(initial);
  let avatar = $state<GlyphAvatar>(start);

  const set = (next: GlyphAvatar) => {
    avatar = next;
    onchange(next);
  };

  return {
    get avatar() {
      return avatar;
    },
    /** True when the draft is not the avatar of the opening. */
    get changed() {
      return glyphAvatarKey(avatar) !== glyphAvatarKey(start);
    },
    shape: (shape: string) => set({ ...avatar, shape }),
    paint: (part: GlyphPart, paint: GlyphPaint) => set({ ...avatar, [part]: paint }),
    flip: (flip: GlyphFlip) => set({ ...avatar, flip }),
    rotate: (degrees: number) => set({ ...avatar, rotate: clamp(Math.round(degrees), -360, 360) }),
    scale: (percent: number) =>
      set({ ...avatar, scale: clamp(Math.round(percent), GLYPH_SCALE.min, GLYPH_SCALE.max) }),
    random: () => set(randomGlyphAvatar(random)),
    reset: () => set(start),
  };
};

export type GlyphEditor = ReturnType<typeof createGlyphEditor>;
