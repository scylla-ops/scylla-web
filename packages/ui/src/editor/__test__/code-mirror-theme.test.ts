// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { defaultHighlightStyle, highlightingFor } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { buildCodeMirrorTheme } from '../code-mirror-theme';

const highlightedTokens = [defaultHighlightStyle.specs[0].tag].flat();

const tokenClass = (isDark: boolean, tokens = highlightedTokens) =>
  highlightingFor(EditorState.create({ extensions: buildCodeMirrorTheme({ isDark }) }), tokens);

describe('buildCodeMirrorTheme', () => {
  // `Extension` is array-shaped internally: compare the two extensions instead.
  it('dark mode adds the oneDarkHighlightStyle override, producing a different extension than light mode', () => {
    const light = buildCodeMirrorTheme({ isDark: false });
    const dark = buildCodeMirrorTheme({ isDark: true });
    expect(dark).not.toEqual(light);
  });

  it('colours the tokens in light mode, as it does in dark mode', () => {
    expect(tokenClass(false)).not.toBeNull();
    expect(tokenClass(true)).not.toBeNull();
  });

  it('colours the keys of an object in both modes, not only the property definitions', () => {
    expect(tokenClass(false, [tags.propertyName])).not.toBeNull();
    expect(tokenClass(true, [tags.propertyName])).not.toBeNull();
  });

  it('colours the commands and the flags of a shell script in both modes', () => {
    for (const isDark of [false, true]) {
      expect(tokenClass(isDark, [tags.standard(tags.variableName)])).not.toBeNull();
      expect(tokenClass(isDark, [tags.attributeName])).not.toBeNull();
    }
  });

  it('flush builds a different frame than the bordered editor, with or without an error', () => {
    for (const hasError of [false, true]) {
      const framed = buildCodeMirrorTheme({ isDark: false, hasError });
      const flush = buildCodeMirrorTheme({ isDark: false, hasError, flush: true });
      expect(flush).not.toEqual(framed);
    }
  });

  it('hasError changes the built extension (destructive accent instead of primary)', () => {
    const normal = buildCodeMirrorTheme({ isDark: false });
    const errored = buildCodeMirrorTheme({ isDark: false, hasError: true });
    expect(errored).not.toEqual(normal);
  });

  it('does not throw with or without hasError, in either color scheme', () => {
    expect(() => buildCodeMirrorTheme({ isDark: false, hasError: true })).not.toThrow();
    expect(() => buildCodeMirrorTheme({ isDark: true, hasError: true })).not.toThrow();
    expect(() => buildCodeMirrorTheme({ isDark: false })).not.toThrow();
  });
});
