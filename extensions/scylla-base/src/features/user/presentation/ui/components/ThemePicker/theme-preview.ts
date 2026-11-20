import type { Theme } from '@scylla/ui/stores';

/**
 * The colors of a thumbnail: the tokens of `@scylla/ui/styles.css` for that theme, fixed, so
 * a thumbnail shows its own theme whatever the theme on screen.
 */
export interface PreviewPalette {
  canvas: string;
  sidebar: string;
  card: string;
  border: string;
  foreground: string;
  muted: string;
  primary: string;
}

export const PREVIEW_PALETTES: Record<Theme, PreviewPalette> = {
  light: {
    canvas: '#F4F7EB',
    sidebar: '#EBEEE2',
    card: '#F4F7EB',
    border: '#E1E3D9',
    foreground: '#171715',
    muted: '#E8EAE0',
    primary: '#447857',
  },
  dark: {
    canvas: '#171715',
    sidebar: '#0F0F0E',
    card: '#1E1E1C',
    border: '#41413F',
    foreground: '#F4F7EC',
    muted: '#2F2F2D',
    primary: '#5D9972',
  },
};
