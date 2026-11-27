import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import Bell from '@lucide/svelte/icons/bell';
import Command from '@lucide/svelte/icons/command';
import Feather from '@lucide/svelte/icons/feather';
import FolderKanban from '@lucide/svelte/icons/folder-kanban';
import GitBranch from '@lucide/svelte/icons/git-branch';
import GitMerge from '@lucide/svelte/icons/git-merge';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import LibraryBig from '@lucide/svelte/icons/library-big';
import Link from '@lucide/svelte/icons/link';
import Palette from '@lucide/svelte/icons/palette';
import ScrollText from '@lucide/svelte/icons/scroll-text';
import Search from '@lucide/svelte/icons/search';
import Server from '@lucide/svelte/icons/server';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Split from '@lucide/svelte/icons/split';
import Store from '@lucide/svelte/icons/store';
import Tags from '@lucide/svelte/icons/tags';
import TextSearch from '@lucide/svelte/icons/text-search';
import Workflow from '@lucide/svelte/icons/workflow';
import type { LucideIcon } from '@scylla/ui';

/** The version that announced a highlight: the version of its "seen" flag. */
export const HIGHLIGHT_VERSIONS = ['0.7.0', '0.7.2', '0.7.3'] as const;
export type HighlightVersion = (typeof HIGHLIGHT_VERSIONS)[number];

/** The versions that have a tab in the dialog. */
export type TabVersion = '0.7.0' | '0.7.1' | '0.7.2' | '0.7.3';

export interface ReleaseHighlight {
  /** Also the key of its "seen" flag in `localStorage`. */
  id: string;
  /** Never change it: the people who saw the highlight keep their flag. */
  since: HighlightVersion;
  /** The tab of the dialog that shows it: the version that really brought it. */
  version: TabVersion;
  title: MessageDescriptor;
  description: MessageDescriptor;
  icon: LucideIcon;
  /** The sidebar entry that shows a "New" badge until the user opens it. */
  navUrl?: string;
}

export interface Release {
  /** The release line, in the title of the dialog. */
  line: string;
  /** Bump it to show the dialog again. It is the version of the flag of the dialog. */
  version: string;
  /** The tabs of the dialog, in order: the newest first. */
  tabs: readonly TabVersion[];
  highlights: readonly ReleaseHighlight[];
}

/** The release announcement: the first-launch dialog and the sidebar badges come from it. */
export const WHATS_NEW = {
  line: '0.7',
  version: '0.7.3',
  tabs: ['0.7.3', '0.7.2', '0.7.1', '0.7.0'],
  highlights: [
    {
      id: 'projects-page',
      since: '0.7.3',
      version: '0.7.3',
      title: msg`A new Projects page`,
      description: msg`Your projects as cards with their pipelines, with search, filters and sort. Put them in colored groups, pin your favorites, drag them into your own order and pick a display: cards, list or tiles. Your groups also show in the sidebar.`,
      icon: FolderKanban,
      navUrl: 'projects',
    },
    {
      id: 'custom-icons',
      since: '0.7.3',
      version: '0.7.3',
      title: msg`Make it yours`,
      description: msg`A glyph in any color or your own image for your projects, workspaces, agents and apps. And for you: a profile photo, imported from GitHub in one click, or an avatar you design yourself, Scylla head included.`,
      icon: Sparkles,
    },
    {
      id: 'command-bar-more',
      since: '0.7.3',
      version: '0.7.3',
      title: msg`Ctrl K finds even more`,
      description: msg`Project groups, dashboards, fragments, jobs, triggers, secrets and members: you now find them all from the keyboard. Rerun a failed job or turn off a trigger right from the bar.`,
      icon: TextSearch,
    },
    {
      id: 'smooth-ui',
      since: '0.7.3',
      version: '0.7.3',
      title: msg`A smoother interface`,
      description: msg`Dialogs, tabs, lists and sections now open and close smoothly. Nothing jumps under your click anymore, and a dialog keeps its size from one tab to the next. Prefer less motion? Scylla follows your system setting.`,
      icon: Feather,
    },
    {
      id: 'pipelines-together',
      since: '0.7.2',
      version: '0.7.2',
      title: msg`Scylla pipelines and file pipelines, together`,
      description: msg`Your Scylla pipelines and file pipelines can now live side by side in one project, each with its badge. If an admin allows it, a Scylla pipeline can also start on a push, a PR or a tag.`,
      icon: GitMerge,
    },
    {
      id: 'start-node-triggers',
      since: '0.7.2',
      version: '0.7.2',
      title: msg`Triggers from the start node`,
      description: msg`Click the start node of a pipeline to see, add and edit its triggers.`,
      icon: Workflow,
    },
    {
      id: 'log-viewer',
      since: '0.7.2',
      version: '0.7.2',
      title: msg`A new log viewer`,
      description: msg`Colors, search, jump to errors, link to a line, full screen and live follow.`,
      icon: ScrollText,
    },
    {
      id: 'agent-labels',
      since: '0.7.2',
      version: '0.7.1',
      title: msg`Labels for your agents`,
      description: msg`Label your agents and choose where each pipeline runs. A waiting job now tells you why.`,
      icon: Tags,
    },
    {
      id: 'command-bar-search',
      since: '0.7.2',
      version: '0.7.2',
      title: msg`A clearer command bar`,
      description: msg`Ctrl K now highlights what matches your search, and a short tour shows you how to use it.`,
      icon: Search,
    },
    {
      id: 'dashboard-links',
      since: '0.7.2',
      version: '0.7.2',
      title: msg`Dashboards you can click`,
      description: msg`Click a pipeline, a run or an agent in a widget to open its page.`,
      icon: LayoutDashboard,
    },
    {
      id: 'copy-link',
      since: '0.7.2',
      version: '0.7.2',
      title: msg`Share any page`,
      description: msg`A button in the top bar now copies the page link in one click.`,
      icon: Link,
    },
    {
      id: 'conditional-nodes',
      since: '0.7.0',
      version: '0.7.0',
      title: msg`Conditions in your pipelines`,
      description: msg`With the If, Switch and Merge nodes, a pipeline now takes a different path based on a value or the result of a node. Errors can have their own path too.`,
      icon: Split,
    },
    {
      id: 'library',
      since: '0.7.0',
      version: '0.7.0',
      title: msg`A library of fragments`,
      description: msg`Turn a group of nodes into a fragment and reuse it in every pipeline of your workspace. Updates are offered, never forced.`,
      icon: LibraryBig,
      navUrl: 'library',
    },
    {
      id: 'marketplace',
      since: '0.7.0',
      version: '0.7.0',
      title: msg`The marketplace`,
      description: msg`Discover fragments published by other teams and add them to your library: linked to follow their updates, or copied to edit freely.`,
      icon: Store,
      navUrl: 'marketplace',
    },
    {
      id: 'command-bar',
      since: '0.7.0',
      version: '0.7.0',
      title: msg`A command bar`,
      description: msg`Ctrl K finds everything: pages, projects, pipelines, agents or people, even with a typo. Run a pipeline or switch theme without leaving the keyboard.`,
      icon: Command,
    },
    {
      id: 'notifications-inbox',
      since: '0.7.0',
      version: '0.7.0',
      title: msg`An inbox`,
      description: msg`All your notifications behind the bell: accept an invitation in one click and follow the failed runs of your workspace.`,
      icon: Bell,
      navUrl: 'notifications',
    },
    {
      id: 'machines',
      since: '0.7.0',
      version: '0.7.0',
      title: msg`Apps and agents`,
      description: msg`Connect an agent in three steps. For your apps, pick the access type: token, CI identity or key pair, and see their last use at a glance.`,
      icon: Server,
    },
    {
      id: 'git-integrations',
      since: '0.7.0',
      version: '0.7.0',
      title: msg`GitHub and GitLab`,
      description: msg`Link a repository to your project, run a pipeline straight from a file of the repository, and export your pipelines as TOML, YAML or JSON.`,
      icon: GitBranch,
    },
    {
      id: 'new-look',
      since: '0.7.0',
      version: '0.7.0',
      title: msg`A new look`,
      description: msg`A resizable double sidebar, new colors and fonts. Your theme and language now follow you on all your devices.`,
      icon: Palette,
    },
  ],
} satisfies Release;
