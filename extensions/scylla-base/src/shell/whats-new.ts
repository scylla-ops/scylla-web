import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import Bell from '@lucide/svelte/icons/bell';
import GitBranch from '@lucide/svelte/icons/git-branch';
import Palette from '@lucide/svelte/icons/palette';
import Search from '@lucide/svelte/icons/search';
import Server from '@lucide/svelte/icons/server';
import Split from '@lucide/svelte/icons/split';
import type { LucideIcon } from '@scylla/ui';

export interface ReleaseHighlight {
  /** Also the key of its "seen" flag in `localStorage`. */
  id: string;
  title: MessageDescriptor;
  description: MessageDescriptor;
  icon: LucideIcon;
  /** The sidebar entry that shows a "New" badge until the user opens it. */
  navUrl?: string;
}

export interface Release {
  /** Bump it to show every announcement again. */
  version: string;
  highlights: readonly ReleaseHighlight[];
}

/** The release announcement: the first-launch dialog and the sidebar badges come from it. */
export const WHATS_NEW = {
  version: '0.7.0',
  highlights: [
    {
      id: 'conditional-nodes',
      title: msg`Pipelines that branch`,
      description: msg`The If, Switch and Merge nodes choose the next nodes from a value or the output of a node. A node that fails can send its error to a port.`,
      icon: Split,
    },
    {
      id: 'command-bar',
      title: msg`A command bar`,
      description: msg`Press Ctrl K to find a page, a project, a pipeline, an agent or a person, even with a typing error. It also runs a pipeline and changes the theme.`,
      icon: Search,
    },
    {
      id: 'notifications-inbox',
      title: msg`An inbox`,
      description: msg`The bell shows your notifications. Accept an invitation in its row, and see the failed runs of your workspace.`,
      icon: Bell,
      navUrl: 'notifications',
    },
    {
      id: 'machines',
      title: msg`Agents and apps under Machines`,
      description: msg`Connect an agent in three steps. An app takes a token, a CI identity or a key pair, and shows its last use.`,
      icon: Server,
    },
    {
      id: 'git-integrations',
      title: msg`GitHub and GitLab`,
      description: msg`Connect a repository to a project, run a pipeline from a file of the repository, and export a pipeline as TOML, YAML or JSON.`,
      icon: GitBranch,
    },
    {
      id: 'new-look',
      title: msg`A new look`,
      description: msg`A double sidebar that you can resize, new colors and fonts, and your theme and language on each of your devices.`,
      icon: Palette,
    },
  ],
} satisfies Release;
