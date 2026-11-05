import {
  isNavGroup,
  isNavItemActive,
  type NavItem,
  type NavNode,
  type NavSection,
  type Rail,
  type RailItem,
  type SecondSidebarContent,
} from '../structs/nav-section.struct.ts';

const pagesOfNode = (node: NavNode): NavItem[] => (isNavGroup(node) ? node.items : [node]);

const railItemOfNode = (node: NavNode): RailItem =>
  isNavGroup(node)
    ? { id: node.id, title: node.title, icon: node.icon, group: node.id, pages: node.items }
    : { id: node.url, title: node.title, icon: node.icon, pages: [node] };

/** A section with `railItem` is one item at the end. A section with `within` has no item. */
export const railFor = (sections: readonly NavSection[]): Rail => ({
  main: sections
    .filter(section => !section.railItem && !section.within)
    .flatMap(section => section.items.map(railItemOfNode)),
  end: sections.flatMap(section =>
    section.railItem
      ? [
          {
            id: section.id,
            title: section.title,
            icon: section.railItem.icon,
            pages: section.items.flatMap(pagesOfNode),
          },
        ]
      : [],
  ),
});

/** The page of the URL: the longest match, because a parent URL is a prefix of its children. */
export const activePageOf = (pages: readonly NavItem[], pathname: string): NavItem | undefined =>
  pages
    .filter(page => isNavItemActive(page, pathname))
    .reduce<
      NavItem | undefined
    >((best, page) => (!best || page.href.length > best.href.length ? page : best), undefined);

/** The rail item of the URL. A rail item with no page of the URL is not selected. */
export const selectedRailItem = (rail: Rail, pathname: string): RailItem | undefined => {
  let selected: RailItem | undefined;
  let longest = -1;
  for (const item of [...rail.main, ...rail.end]) {
    const length = activePageOf(item.pages, pathname)?.href.length ?? -1;
    if (length > longest) {
      selected = item;
      longest = length;
    }
  }
  return selected;
};

/**
 * What the second sidebar shows for a rail item. A section `within` this item takes its place
 * while the URL fills the parameters of its links: `navSectionsFor` drops it otherwise.
 */
export const secondSidebarFor = (
  item: RailItem,
  sections: readonly NavSection[],
  params: Readonly<Record<string, string | undefined>>,
): SecondSidebarContent => {
  const nested = sections.find(section => section.within?.railItem === item.id);
  if (!nested?.within) return { id: item.id, title: item.title, pages: item.pages };
  return {
    id: nested.id,
    title: params[nested.within.titleParam] ?? nested.title,
    pages: nested.items.flatMap(pagesOfNode),
  };
};
