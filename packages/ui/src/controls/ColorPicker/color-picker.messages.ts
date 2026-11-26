import { msg } from '@lingui/core/macro';

export const colorPickerMessages = {
  area: msg`Saturation and brightness`,
  hue: msg`Hue`,
  hex: msg`Hex color`,
  eyedropper: msg`Pick a color on the screen`,
  recent: msg({ message: 'Recent', context: 'colors' }),
  recentColor: (hex: string) => msg`Color ${hex}`,
  darkOnTint: (ratio: string) => msg`Dark theme ${ratio}:1: the color on its tint`,
  lightOnTint: (ratio: string) => msg`Light theme ${ratio}:1: the color on its tint`,
  darkSolidLightGlyph: (ratio: string, glyph: string) =>
    msg`Dark theme ${ratio}:1: set as a solid tile, light glyph (${glyph}:1)`,
  darkSolidDarkGlyph: (ratio: string, glyph: string) =>
    msg`Dark theme ${ratio}:1: set as a solid tile, dark glyph (${glyph}:1)`,
  lightSolidLightGlyph: (ratio: string, glyph: string) =>
    msg`Light theme ${ratio}:1: set as a solid tile, light glyph (${glyph}:1)`,
  lightSolidDarkGlyph: (ratio: string, glyph: string) =>
    msg`Light theme ${ratio}:1: set as a solid tile, dark glyph (${glyph}:1)`,
};
