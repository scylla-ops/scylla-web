import { i18n } from '@lingui/core';
import type { MessageDescriptor } from '@lingui/core';

/**
 * `lingui extract` does not read `.svelte` files: declare messages with `msg` in
 * a `*.messages.ts` and render them with `t`, which re-renders on a locale switch.
 */
let locale = $state(i18n.locale);

i18n.on('change', () => {
  locale = i18n.locale;
});

/**
 * Keyed by the descriptor object, not by its id: the id is a hash of the source string, so two
 * modules that both say "Password" share it, and an override must change one of them only.
 */
let overrides: ReadonlyMap<MessageDescriptor, MessageDescriptor> | null = null;

/** The composition root installs the text overrides of the widget injections. */
export const setMessageOverrides = (
  next: ReadonlyMap<MessageDescriptor, MessageDescriptor> | null,
): void => {
  overrides = next;
};

/** Read it in a template to re-render on a locale switch. */
export const activeLocale = (): string => locale;

export const t = (descriptor: MessageDescriptor): string => {
  void locale;
  return i18n._(overrides?.get(descriptor) ?? descriptor);
};
