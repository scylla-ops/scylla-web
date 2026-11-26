import { describe, expect, it, vi } from 'vitest';
import { contrastLines, MAX_RECENT_COLORS, withRecentColor } from './color-picker.ts';
import { createColorPicker } from './color-picker.state.svelte.ts';

describe('createColorPicker', () => {
  it('opens on the given color, and on a fallback color when it is not a color', () => {
    expect(createColorPicker('#e879f9', () => {}).hex).toBe('#E879F9');
    expect(createColorPicker('primary', () => {}).text).toMatch(/^[0-9A-F]{6}$/);
  });

  it('sets the saturation from the left and the value from the bottom of the area', () => {
    const onchange = vi.fn();
    const picker = createColorPicker('#FF0000', onchange);

    picker.setPoint(1, 1);
    expect(picker.hex).toBe('#000000');
    picker.setPoint(0, 0);
    expect(picker.hex).toBe('#FFFFFF');
    picker.setPoint(1, 0);

    // The hue of red stays through the black and the white.
    expect(picker.hex).toBe('#FF0000');
    expect(picker.text).toBe('FF0000');
    expect(onchange).toHaveBeenLastCalledWith('#FF0000');
  });

  it('moves the point with the arrow keys, and the hue with the slider', () => {
    const picker = createColorPicker('#FF0000', () => {});

    picker.nudge(0, 50);
    expect(picker.hsv.v).toBe(0);
    picker.nudge(0, -50);
    picker.setHue(240);
    expect(picker.hex).toBe('#0000FF');
  });

  it('takes a typed hex color, and gives the field back its color after a bad text', () => {
    const onchange = vi.fn();
    const picker = createColorPicker('#FF0000', onchange);

    picker.type('#4338ca');
    expect(picker.hex).toBe('#4338CA');
    expect(onchange).toHaveBeenLastCalledWith('#4338CA');

    picker.type('43');
    expect(picker.text).toBe('43');
    expect(picker.hex).toBe('#4338CA');
    picker.commitText();
    expect(picker.text).toBe('4338CA');
  });

  it('keeps the hue when a grey is picked', () => {
    const picker = createColorPicker('#0000FF', () => {});

    picker.pick('#808080');
    expect(picker.hex).toBe('#808080');
    expect(picker.hsv.h).toBe(240);
    expect(picker.hueColor).toBe('#0000FF');
  });
});

describe('contrastLines', () => {
  it('keeps the tint where the color contrasts 3:1 with the card, else makes the tile solid', () => {
    const [dark, light] = contrastLines('#E879F9');

    expect(dark).toMatchObject({ theme: 'dark', ok: true });
    expect(dark?.message.values).toEqual({ ratio: '6.8' });
    expect(light).toMatchObject({ theme: 'light', ok: false });
    expect(light?.message.message).toContain('dark glyph');
  });

  it('gives a light glyph and its contrast to a dark color in the dark theme', () => {
    const [dark, light] = contrastLines('#4338CA');

    expect(dark).toMatchObject({ ok: false });
    expect(dark?.message.message).toContain('light glyph');
    expect(dark?.message.values).toEqual({ ratio: '2.1', glyph: '7.9' });
    expect(light).toMatchObject({ ok: true });
  });
});

describe('withRecentColor', () => {
  it('puts the color first, with no duplicate, and keeps the most recent ones', () => {
    const recent = ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777'];

    expect(withRecentColor(recent, '#333333').slice(0, 3)).toEqual([
      '#333333',
      '#111111',
      '#222222',
    ]);
    expect(withRecentColor([...recent, '#888888'], '#abcdef')).toHaveLength(MAX_RECENT_COLORS);
    expect(withRecentColor(recent, '#abcdef')[0]).toBe('#ABCDEF');
  });
});
