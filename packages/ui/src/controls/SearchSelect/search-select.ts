export interface SearchSelectOption {
  /** Not empty: Enter does not pick an option with an empty value. */
  value: string;
  label: string;
  /** A second line of the row. The search reads it. */
  hint?: string;
  /** More text for the search, not on the row. */
  keywords?: readonly (string | undefined)[];
  disabled?: boolean;
}
