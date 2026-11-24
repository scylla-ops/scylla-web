import { routeParams } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { fillPath } from '../../routing/compilation/route-path.ts';
import { mergeParams, type ShellConfig } from '../shell-config.ts';
import type { NavSection } from '../structs/nav-section.struct.ts';
import { navSectionsFor } from './nav-sections.ts';

/** Reactive. The sections of the sidebar and of the first crumb: what this user can open here. */
export const reactiveNavSections = (getConfig: () => ShellConfig): (() => NavSection[]) => {
  const config = $derived(getConfig());
  const linkParams = $derived(
    mergeParams([routeParams, ...config.contributions.map(shell => shell.linkParams)]),
  );
  const sections = $derived(
    navSectionsFor({
      entries: config.entries,
      sections: config.sections,
      hrefOf: entry => fillPath(entry.pattern, linkParams),
      can: permission => config.access?.can(permission) ?? true,
      translate: t,
    }),
  );
  return () => sections;
};
