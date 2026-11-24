const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

/** Each word of the search is in one of the fields. Case and accents do not count. */
export const matchesSearch = (
  search: string,
  fields: readonly (string | undefined)[],
): boolean => {
  const words = fold(search).split(/\s+/).filter(Boolean);
  const text = fold(fields.filter(Boolean).join(' '));
  return words.every(word => text.includes(word));
};
