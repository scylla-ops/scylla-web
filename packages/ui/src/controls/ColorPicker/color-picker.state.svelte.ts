import { hsvToRgb, parseHex, rgbToHsv, toHex, type Hsv, type Rgb } from '../../utils/color.ts';

/** The color of a picker that opens with no valid color: `#E879F9`. */
const FALLBACK: Rgb = { r: 232, g: 121, b: 249 };

/** One step of an arrow key on the saturation and value area. */
const STEP = 0.02;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * The color of a free color picker: hue, saturation and value, and the text of its hex field.
 * The hue stays when the saturation or the value goes to zero, where the hex color loses it.
 */
export const createColorPicker = (initial: string, onchange: (hex: string) => void) => {
  const start = parseHex(initial) ?? FALLBACK;
  let hsv = $state<Hsv>(rgbToHsv(start));
  const hex = $derived(toHex(hsvToRgb(hsv)));
  let text = $state(toHex(start).slice(1));

  const set = (next: Hsv) => {
    hsv = next;
    text = hex.slice(1);
    onchange(hex);
  };

  /** Takes a hex color, and keeps the hue of a grey. Gives it in upper case, or null. */
  const take = (color: string): string | null => {
    const rgb = parseHex(color);
    if (!rgb) return null;
    const next = rgbToHsv(rgb);
    hsv = next.s === 0 || next.v === 0 ? { ...next, h: hsv.h } : next;
    onchange(toHex(rgb));
    return toHex(rgb);
  };

  return {
    get hsv() {
      return hsv;
    },
    get hex() {
      return hex;
    },
    /** The pure color of the hue: the fill of the area. */
    get hueColor() {
      return toHex(hsvToRgb({ h: hsv.h, s: 1, v: 1 }));
    },
    /** The text of the hex field, with no `#`. */
    get text() {
      return text;
    },
    /** A point of the area: the saturation from the left, the value from the bottom. */
    setPoint(x: number, y: number) {
      set({ ...hsv, s: clamp(x), v: clamp(1 - y) });
    },
    setHue(h: number) {
      set({ ...hsv, h: Math.min(360, Math.max(0, h)) });
    },
    /** An arrow key on the area. */
    nudge(dx: number, dy: number) {
      set({ ...hsv, s: clamp(hsv.s + dx * STEP), v: clamp(hsv.v - dy * STEP) });
    },
    /** A text typed in the hex field: the color changes when it has six hex digits. */
    type(value: string) {
      text = value.replace(/^#/, '');
      take(text);
    },
    /** Puts the field back to the color, after a text that is not a color. */
    commitText() {
      text = hex.slice(1);
    },
    /** A recent color, or the color of the eyedropper. */
    pick(color: string) {
      const taken = take(color);
      if (taken) text = taken.slice(1);
    },
  };
};

export type ColorPickerState = ReturnType<typeof createColorPicker>;
