import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { currentTheme } from '../stores/theme.store.ts';
import { buildCodeMirrorTheme } from './code-mirror-theme.ts';

export interface CodeMirrorOptions {
  /**
   * Read once, when the view is created. Replacing the whole document would lose
   * the scroll and the selection: the owner dispatches its changes through `onView`.
   */
  doc?: string;
  /** Reconfigured in place when it changes: the document stays. */
  extensions?: Extension[];
  hasError?: boolean;
  /** See `CodeMirrorThemeOptions.flush`. */
  flush?: boolean;
  /** The live view once it exists, `null` after teardown. */
  onView?: (view: EditorView | null) => void;
}

/**
 * Mounts a CodeMirror 6 editor with the app's theme. Only the extensions the
 * caller gives are loaded. The options are a getter: the view is created once,
 * and a change of theme, error or extensions reconfigures a `Compartment` in place.
 *
 * `{@attach renderCodeMirror(() => ({ doc, extensions, onView }))}`
 */
export const renderCodeMirror =
  (options: () => CodeMirrorOptions): Attachment<HTMLElement> =>
  node => {
    const themeCompartment = new Compartment();
    const extensionsCompartment = new Compartment();
    const initial = untrack(options);

    // `options()` also reads `doc`, which changes at each keystroke: compare what the theme uses.
    const themeKey = () =>
      `${currentTheme()}:${options().hasError ?? false}:${options().flush ?? false}`;
    const theme = () =>
      buildCodeMirrorTheme({
        isDark: currentTheme() !== 'light',
        hasError: options().hasError ?? false,
        flush: options().flush ?? false,
      });

    const view = new EditorView({
      parent: node,
      state: EditorState.create({
        doc: initial.doc ?? '',
        extensions: [
          themeCompartment.of(untrack(theme)),
          extensionsCompartment.of(initial.extensions ?? []),
        ],
      }),
    });
    initial.onView?.(view);

    let configuredTheme = untrack(themeKey);
    $effect(() => {
      const next = themeKey();
      if (next === configuredTheme) return;
      configuredTheme = next;
      view.dispatch({ effects: themeCompartment.reconfigure(untrack(theme)) });
    });

    // Compared by identity: a `$derived` gives a new array only when something changed.
    let configuredExtensions = initial.extensions ?? [];
    $effect(() => {
      const next = options().extensions ?? [];
      if (next === configuredExtensions) return;
      configuredExtensions = next;
      view.dispatch({ effects: extensionsCompartment.reconfigure(next) });
    });

    return () => {
      initial.onView?.(null);
      view.destroy();
    };
  };
