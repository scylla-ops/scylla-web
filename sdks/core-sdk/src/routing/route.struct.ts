/** Always strings. A page declares the ones it reads as optional props. */
export type RouteParams = Record<string, string | undefined>;

/**
 * Where a module's routes graft, e.g. `workspace`. A module declares the
 * mounts; the core gives each one its path, layout and wrappers.
 */
export type RouteMount = string;

/**
 * The page has the share button of the top bar. `true` shares the address of the page; `url`
 * gives another link, or `null` to hide the button, e.g. while only its owner can open the item.
 */
export type RouteShare = true | { url: () => string | null };
