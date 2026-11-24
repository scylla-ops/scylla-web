/**
 * The label after a count, in the plural rule of the locale: English says "0 roles", French
 * "0 rôle". A French title has a capital on its first word only, and the count is that word:
 * "3 projets". English keeps the capital: "3 Projects". An acronym ("API") stays as it is.
 */
export const countedLabel = (
  count: number,
  label: string,
  pluralLabel: string,
  locale: string,
): string => {
  const noun = new Intl.PluralRules(locale).select(count) === 'one' ? label : pluralLabel;
  return locale === 'fr' && /^\p{Lu}\p{Ll}/u.test(noun)
    ? `${noun.charAt(0).toLocaleLowerCase(locale)}${noun.slice(1)}`
    : noun;
};
