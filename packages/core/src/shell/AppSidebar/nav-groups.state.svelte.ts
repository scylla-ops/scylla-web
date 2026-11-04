import { isNavGroup, isNavItemActive, type NavSection } from '../structs/nav-section.struct.ts';

/** Out of the sidebar: a page with no shell unmounts it. */
let open = $state<Record<string, boolean>>({});

/** Reactive. */
export const isNavGroupOpen = (id: string): boolean => open[id] ?? false;

export const toggleNavGroup = (id: string): void => {
  open[id] = !isNavGroupOpen(id);
};

/** Opens a group once for each page of the group that the user goes to. Never closes a group. */
export const openNavGroupsOnArrival = (
  sections: () => readonly NavSection[],
  pathname: () => string,
): void => {
  const arrivals: Record<string, string | undefined> = {};

  $effect.pre(() => {
    const page = pathname();
    for (const group of sections()
      .flatMap(section => section.items)
      .filter(isNavGroup)) {
      const arrival = group.items.some(item => isNavItemActive(item, page)) ? page : undefined;
      if (arrival && arrival !== arrivals[group.id]) open[group.id] = true;
      arrivals[group.id] = arrival;
    }
  });
};

/** For tests. */
export const resetNavGroups = (): void => {
  open = {};
};
