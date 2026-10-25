import { EditorView } from '@codemirror/view';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import type { Extension } from '@codemirror/state';
import { defaultHighlightStyle, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export interface CodeMirrorThemeOptions {
  isDark: boolean;
  /** Turns the accent (border, focus bar) destructive. */
  hasError?: boolean;
  /**
   * The editor fills a container that draws its own frame: no border and no round corners. The
   * focus shows as an inner outline with a bar on the left edge; an error, as the bar.
   */
  flush?: boolean;
}

// `defaultHighlightStyle` leaves some tokens plain: object keys, and the commands and flags of a
// shell script. `oneDarkHighlightStyle` colours them, so the light theme adds them.
const lightExtraStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: '#00c' },
  { tag: tags.standard(tags.variableName), color: '#05a' },
  { tag: tags.attributeName, color: '#219' },
]);

/** The editor theme, from the app's CSS variables, so it follows light/dark. */
export const buildCodeMirrorTheme = ({
  isDark,
  hasError = false,
  flush = false,
}: CodeMirrorThemeOptions): Extension => {
  const accent = hasError ? 'var(--destructive)' : 'var(--primary)';
  const frame: Record<string, string> = flush
    ? { boxShadow: hasError ? 'inset 2px 0 0 0 var(--destructive)' : 'none' }
    : {
        borderRadius: '0.75rem',
        border: `1px solid ${hasError ? 'var(--destructive)' : 'var(--border)'}`,
        transition: 'border-color 0.1s ease-in-out, box-shadow 0.1s ease-in-out',
      };
  const focusedFrame: Record<string, string> = flush
    ? { boxShadow: `inset 0 0 0 1px ${accent}, inset 3px 0 0 0 ${accent}` }
    : {
        boxShadow: `-2px 0 0px 0px ${accent}, 0 1px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)`,
        borderRadius: '0.75rem',
      };

  const theme = EditorView.theme(
    {
      '&': {
        backgroundColor: 'var(--code-editor-bg)',
        color: 'var(--foreground)',
        overflow: 'hidden',
        maxWidth: '100%',
        ...frame,
      },
      '.cm-scroller': { overflow: 'auto', backgroundColor: 'var(--code-editor-bg)' },
      '.cm-content': { padding: '0.5rem', caretColor: 'var(--foreground)' },
      '.cm-placeholder': { color: 'var(--muted-foreground)' },
      // Must stay translucent: the selection layer is drawn under the lines.
      '.cm-activeLine': { backgroundColor: 'var(--code-editor-line-bg)' },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--code-editor-line-bg)',
        color: 'var(--foreground)',
      },
      '.cm-lineNumbers': { color: 'var(--muted-foreground)' },
      '.cm-gutters': {
        backgroundColor: 'var(--code-editor-bg)',
        borderRight: '1px solid var(--border)',
        color: 'var(--muted-foreground)',
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'var(--muted)',
        color: 'var(--muted-foreground)',
        border: 'none',
      },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--foreground)' },
      // The full path is needed to beat the base theme's `.cm-selectionBackground` on specificity.
      '.cm-selectionBackground, .cm-content ::selection, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground':
        {
          backgroundColor: 'var(--code-editor-selection-bg)',
        },
      '.cm-selectionMatch': { backgroundColor: 'var(--code-editor-match-bg)' },
      '.cm-matchingBracket, .cm-nonmatchingBracket': {
        backgroundColor: 'var(--code-editor-match-bg)',
        outline: '1px solid var(--border)',
      },
      '.cm-panels, .cm-tooltip': {
        backgroundColor: 'var(--popover)',
        color: 'var(--popover-foreground)',
        border: '1px solid var(--border)',
      },
      '.cm-diagnostic-error': { borderLeftColor: 'var(--destructive)' },
      '.cm-tooltip-autocomplete ul li[aria-selected]': {
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-foreground)',
      },
      '&.cm-focused': { outline: 'none', ...focusedFrame },
    },
    { dark: isDark },
  );

  return isDark
    ? [theme, syntaxHighlighting(oneDarkHighlightStyle)]
    : [theme, syntaxHighlighting(defaultHighlightStyle), syntaxHighlighting(lightExtraStyle)];
};
