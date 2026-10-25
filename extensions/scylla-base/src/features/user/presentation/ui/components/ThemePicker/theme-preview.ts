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
    sidebar: '#EFF2E7',
    card: '#F7F9EE',
    border: '#D1D3CA',
    foreground: '#272921',
    muted: '#E8EAE0',
    primary: '#5D9972',
  },
  dark: {
    canvas: '#1C1C1A',
    sidebar: '#141412',
    card: '#21211E',
    border: '#333330',
    foreground: '#F4F7EC',
    muted: '#282826',
    primary: '#5D9972',
  },
};
