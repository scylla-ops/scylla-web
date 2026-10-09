import type { MessageDescriptor } from '@lingui/core';
import type { NavSectionDefinition, RoutePermission } from '@scylla/core-sdk';
import type { NavEntry } from '../routing/compilation/nav-entries.ts';
import type { NavSection } from './structs/nav-section.struct.ts';

export interface NavSectionsInput {
  entries: readonly NavEntry[];
  sections: readonly NavSectionDefinition[];
  /** The URL of an entry. `null` when the current URL cannot fill its parameters. */
  hrefOf: (entry: NavEntry) => string | null;
  can: (permission: RoutePermission) => boolean;
  translate: (message: MessageDescriptor) => string;
}

/**
 * Hides the entries the user cannot open or the current URL cannot fill, then
 * the empty sections. A section with a header stays.
 */
export const navSectionsFor = ({
  entries,
  sections,
  hrefOf,
  can,
  translate,
}: NavSectionsInput): NavSection[] =>
  sections
    .map(({ id, title, header }) => ({
      id,
      title: translate(title),
      header,
      items: entries
        .filter(entry => entry.section === id)
        .filter(entry => entry.permission === undefined || can(entry.permission))
        .flatMap(entry => {
          const href = hrefOf(entry);
          return href === null
            ? []
            : [{ title: translate(entry.title), href, url: entry.url, icon: entry.icon }];
        }),
    }))
    .filter(section => section.items.length > 0 || section.header);
