import type { SearchSelectOption } from '@scylla/ui';

export const browserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const browserTimeZones = (): readonly string[] => Intl.supportedValuesOf('timeZone');

/**
 * The zone of the browser comes first, with its hint. The current zone and UTC are rows also
 * when the browser does not list them: a browser lists the canonical names only.
 */
export const timeZoneOptions = (
  names: readonly string[],
  current: string,
  browser: string,
  browserHint: string,
): SearchSelectOption[] => {
  const others = [...new Set([...names, current, 'UTC'])]
    .filter(name => name !== browser)
    .sort((a, b) => a.localeCompare(b, 'en'));
  return [
    { value: browser, label: browser, hint: browserHint },
    ...others.map(name => ({ value: name, label: name })),
  ];
};
