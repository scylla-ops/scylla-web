import type {
  SecondSidebarLink,
  SecondSidebarSection,
  SecondSidebarStatus,
} from '@scylla/core-sdk';
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

/** Every page of a section, the pages of its groups in their place. */
export const sectionPages = (section: NavSection): NavItem[] => section.items.flatMap(pagesOfNode);

const railItemOfSection = (section: NavSection): RailItem => ({
  id: section.id,
  title: section.title,
  icon: section.railItem?.icon,
  pages: sectionPages(section),
});

/**
 * A section with `railItem` is one item at the end. A section with `within` has no item. A section
 * with `noRailItem` has no row, but the URL can select it.
 */
export const railFor = (sections: readonly NavSection[]): Rail => ({
  main: sections
    .filter(section => !section.railItem && !section.within && !section.noRailItem)
    .flatMap(section => section.items.map(railItemOfNode)),
  end: sections.filter(section => section.railItem).map(railItemOfSection),
  hidden: sections.filter(section => section.noRailItem).map(railItemOfSection),
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
  for (const item of [...rail.main, ...rail.end, ...rail.hidden]) {
    const length = activePageOf(item.pages, pathname)?.href.length ?? -1;
    if (length > longest) {
      selected = item;
      longest = length;
    }
  }
  return selected;
};

/** The sections of the phone sheet: a section with `noRailItem` shows only on its pages. */
export const sheetSections = (sections: readonly NavSection[], pathname: string): NavSection[] =>
  sections.filter(
    section =>
      !section.noRailItem ||
      activePageOf(section.items.flatMap(pagesOfNode), pathname) !== undefined,
  );

/**
 * The section of the phone sheet that holds what the second sidebar shows: the section itself
 * (a section with `railItem`, `within` or `noRailItem`), or the section of its group or its link.
 */
export const sheetHolderOf = (
  sections: readonly NavSection[],
  contentId: string,
): string | undefined =>
  sections.find(
    section =>
      section.id === contentId ||
      section.items.some(node => (isNavGroup(node) ? node.id : node.url) === contentId),
  )?.id;

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

/** The pages, then the links of the modules, apart from them. Such a link has its URL as `url`. */
export const withModuleLinks = (
  content: SecondSidebarContent,
  links: readonly SecondSidebarLink[],
): SecondSidebarContent =>
  links.length === 0
    ? content
    : {
        ...content,
        pages: [
          ...content.pages,
          ...links.map(({ title, href, icon, entityIcon, apart, section, status }, index) => ({
            title,
            href,
            url: href,
            icon,
            entityIcon,
            apart: apart ?? index === 0,
            section,
            status,
          })),
        ],
      };

/** The mark of a tone in the title of a folded section. */
export interface SectionMark {
  tone: SecondSidebarStatus['tone'];
  /** Each hidden link with this tone, by name, e.g. `api: The last job failed`. */
  label: string;
}

const MARK_ORDER: readonly SecondSidebarStatus['tone'][] = ['failed', 'running'];

/** What the hidden links of a folded section tell: one mark for each tone, a failure first. */
export const sectionMarks = (pages: readonly NavItem[]): SectionMark[] =>
  MARK_ORDER.flatMap(tone => {
    const marked = pages.filter(page => page.status?.tone === tone);
    if (marked.length === 0) return [];
    return [
      {
        tone,
        label: marked.map(page => `${page.title}: ${page.status?.label ?? ''}`).join(', '),
      },
    ];
  });

/** A run of pages of the second sidebar: pages with no section, or the pages of one section. */
export interface PageRun {
  /** Unique in the list of the runs. */
  key: string;
  section?: SecondSidebarSection;
  pages: NavItem[];
}

/** The pages in runs: the next pages of one section are one run, under the title of the section. */
export const pageRuns = (pages: readonly NavItem[]): PageRun[] => {
  const runs: PageRun[] = [];
  for (const page of pages) {
    const last = runs.at(-1);
    if (last && last.section?.key === page.section?.key) {
      last.pages.push(page);
    } else {
      const key = page.section ? `section:${page.section.key}` : `pages:${runs.length}`;
      runs.push({ key, section: page.section, pages: [page] });
    }
  }
  return runs;
};
