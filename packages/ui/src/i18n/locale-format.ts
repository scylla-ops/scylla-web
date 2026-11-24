import { activeLocale } from './lingui.adapter.svelte.ts';

/** Cached per locale and options, never at import time: the locale changes at runtime. */
const numberFormats = new Map<string, Intl.NumberFormat>();

/** The locale of the UI for `Intl`. Read in a template, it re-renders on a locale switch. */
export const intlLocale = (): string => activeLocale() || 'en';

/** A number in the language of the UI: "0.7" and "1,312" in English, "0,7" and "1 312" in French. */
export const formatNumber = (value: number, options: Intl.NumberFormatOptions = {}): string => {
  const locale = intlLocale();
  const key = `${locale}:${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }
  return format.format(value);
};
