/** The picks after which the bar knows the user: the recent list of the workspace counts them. */
export const HINTS_UNTIL_PICKS = 3;

/**
 * The empty bar teaches until the user picked a few results in this workspace. While a tour holds the
 * dialog, its cards point at the examples: they show whatever the recent picks.
 */
export const showCommandHints = (recentCount: number, searching: boolean, touring = false): boolean =>
  !searching && (touring || recentCount < HINTS_UNTIL_PICKS);

/** The searches that the empty bar offers to try: a prefix, a typing error, a person. */
export const HINT_EXAMPLES: readonly string[] = ['> new', 'agnts', '@'];
