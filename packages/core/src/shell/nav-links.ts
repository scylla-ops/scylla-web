import { routeParams, type AppNavLink } from '@scylla/core-sdk';
import { fillPath } from '../routing/compilation/route-path.ts';
import { openableEntries } from './AppSidebar/nav-sections.ts';
import { mergeParams, type ShellConfig } from './shell-config.ts';

/** Reactive when the sources are. The rule of the sidebar: the same user sees the same links. */
export const navLinksFor =
  (config: ShellConfig) =>
  (): AppNavLink[] => {
    const params = mergeParams([
      routeParams,
      ...config.contributions.map(shell => shell.linkParams),
    ]);
    const input = {
      entries: config.entries,
      hrefOf: (entry: { pattern: readonly string[] }) => fillPath(entry.pattern, params),
      can: (permission: Parameters<NonNullable<ShellConfig['access']>['can']>[0]) =>
        config.access?.can(permission) ?? true,
    };
    return config.sections.flatMap(section =>
      openableEntries(input, section.id).map(({ entry, href }) => ({
        href,
        url: entry.url,
        title: entry.title,
        keywords: entry.keywords,
        icon: entry.icon,
        section: { id: section.id, title: section.title },
        group: entry.group?.title,
      })),
    );
  };
