import type {
  AccessPolicy,
  NavSectionDefinition,
  RouteParams,
  ShellContributions,
} from '@scylla/core-sdk';
import type { NavEntry } from '../routing/compilation/nav-entries.ts';

/** What the shell renders, merged from every extension. */
export interface ShellConfig {
  entries: readonly NavEntry[];
  sections: readonly NavSectionDefinition[];
  access?: AccessPolicy;
  contributions: readonly ShellContributions[];
}

const EMPTY: ShellConfig = { entries: [], sections: [], contributions: [] };

let current: ShellConfig = EMPTY;

/** Call it once, before the shell renders. */
export const setShellConfig = (config: ShellConfig | null): void => {
  current = config ?? EMPTY;
};

export const shellConfig = (): ShellConfig => current;

/** Reactive when the sources are. A later source wins; an `undefined` value is not a value. */
export const mergeParams = (sources: readonly ((() => RouteParams) | undefined)[]): RouteParams => {
  const merged: RouteParams = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source?.() ?? {})) {
      if (value !== undefined) merged[key] = value;
    }
  }
  return merged;
};
