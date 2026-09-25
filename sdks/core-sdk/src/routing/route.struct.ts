/** Always strings. A page declares the ones it reads as optional props. */
export type RouteParams = Record<string, string | undefined>;

/**
 * Where a module's routes graft, e.g. `organization`. A module declares the
 * mounts; the core gives each one its path, layout and wrappers.
 */
export type RouteMount = string;
