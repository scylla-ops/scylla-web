import type { MessageDescriptor } from '@lingui/core';
import { formatNumber } from '../../i18n/locale-format.ts';
import { iconColors, LIGHT_GLYPH, type ColorTheme } from '../../utils/color.ts';
import { colorPickerMessages as m } from './color-picker.messages.ts';

/** The most recent colors that a picker shows. */
export const MAX_RECENT_COLORS = 8;

export interface ContrastLine {
  theme: ColorTheme;
  /** The color keeps its tint: it contrasts at least 3:1 with the card of the theme. */
  ok: boolean;
  message: MessageDescriptor;
}

const ratioText = (ratio = 0) =>
  formatNumber(ratio, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** What the contrast rule does with a free color on the card of each theme. */
export const contrastLines = (hex: string): ContrastLine[] =>
  (['dark', 'light'] as const).map(theme => {
    const colors = iconColors(hex, theme);
    const ratio = ratioText(colors.ratio);
    if (!colors.solid) {
      return {
        theme,
        ok: true,
        message: theme === 'dark' ? m.darkOnTint(ratio) : m.lightOnTint(ratio),
      };
    }
    const glyph = ratioText(colors.glyphRatio);
    const light = colors.glyph === LIGHT_GLYPH;
    const message =
      theme === 'dark'
        ? (light ? m.darkSolidLightGlyph : m.darkSolidDarkGlyph)(ratio, glyph)
        : (light ? m.lightSolidLightGlyph : m.lightSolidDarkGlyph)(ratio, glyph);
    return { theme, ok: false, message };
  });

/** Puts a color first in the recent colors, with no duplicate, and keeps the most recent ones. */
export const withRecentColor = (recent: readonly string[], hex: string): string[] => {
  const color = hex.toUpperCase();
  return [color, ...recent.filter(other => other.toUpperCase() !== color)].slice(
    0,
    MAX_RECENT_COLORS,
  );
};

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperApi {
  open(): Promise<EyeDropperResult>;
}

type EyeDropperConstructor = new () => EyeDropperApi;

const eyeDropperClass = (): EyeDropperConstructor | undefined =>
  (globalThis as { EyeDropper?: EyeDropperConstructor }).EyeDropper;

/** The browser can pick a color on the screen (Chromium only). */
export const hasEyeDropper = (): boolean => eyeDropperClass() !== undefined;

/** Picks a color on the screen. Undefined when the person cancels or the browser cannot. */
export const pickScreenColor = async (): Promise<string | undefined> => {
  const EyeDropper = eyeDropperClass();
  if (!EyeDropper) return undefined;
  try {
    return (await new EyeDropper().open()).sRGBHex;
  } catch {
    return undefined;
  }
};
