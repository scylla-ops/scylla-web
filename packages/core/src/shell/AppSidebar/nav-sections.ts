import type { MessageDescriptor } from '@lingui/core';
import type { NavSectionDefinition, RoutePermission } from '@scylla/core-sdk';
import type { NavEntry } from '../../routing/compilation/nav-entries.ts';
import type { NavItem, NavNode, NavSection } from '../structs/nav-section.struct.ts';

export interface NavSectionsInput {
  entries: readonly NavEntry[];
  sections: readonly NavSectionDefinition[];
  /** The URL of an entry. `null` when the current URL cannot fill its parameters. */
  hrefOf: (entry: NavEntry) => string | null;
  can: (permission: RoutePermission) => boolean;
  translate: (message: MessageDescriptor) => string;
}

/** A link that the user can open, with its entry. */
interface Link {
  entry: NavEntry;
  item: NavItem;
}

/**
 * Puts the links of one group under one folding item, at the place of the first link of the
 * group.
 */
const grouped = (
  links: readonly Link[],
  translate: (message: MessageDescriptor) => string,
): NavNode[] => {
  const nodes: NavNode[] = [];
  const groups = new Map<string, NavItem[]>();
  for (const { entry, item } of links) {
    const group = entry.group;
    if (!group) {
      nodes.push(item);
      continue;
    }
    const items = groups.get(group.id);
    if (items) {
      items.push(item);
      continue;
    }
    const created = [item];
    groups.set(group.id, created);
    nodes.push({ id: group.id, title: translate(group.title), icon: group.icon, items: created });
  }
  return nodes;
};

/**
 * Hides the entries the user cannot open or the current URL cannot fill, then
 * the empty sections. The links of one group fold under one item.
 */
export const navSectionsFor = ({
  entries,
  sections,
  hrefOf,
  can,
  translate,
}: NavSectionsInput): NavSection[] =>
  sections
    .map(({ id, title, railItem, within }) => {
      const links = entries
        .filter(entry => entry.section === id)
        .filter(entry => entry.permission === undefined || can(entry.permission))
        .flatMap((entry): Link[] => {
          const href = hrefOf(entry);
          if (href === null) return [];
          const item = { title: translate(entry.title), href, url: entry.url, icon: entry.icon };
          return [{ entry, item }];
        });
      return { id, title: translate(title), railItem, within, items: grouped(links, translate) };
    })
    .filter(section => section.items.length > 0);
