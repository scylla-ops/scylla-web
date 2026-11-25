import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import Bell from '@lucide/svelte/icons/bell';
import GitBranch from '@lucide/svelte/icons/git-branch';
import GitMerge from '@lucide/svelte/icons/git-merge';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import LibraryBig from '@lucide/svelte/icons/library-big';
import Link from '@lucide/svelte/icons/link';
import MailCheck from '@lucide/svelte/icons/mail-check';
import Palette from '@lucide/svelte/icons/palette';
import ScrollText from '@lucide/svelte/icons/scroll-text';
import Search from '@lucide/svelte/icons/search';
import Server from '@lucide/svelte/icons/server';
import Split from '@lucide/svelte/icons/split';
import Store from '@lucide/svelte/icons/store';
import Tags from '@lucide/svelte/icons/tags';
import Workflow from '@lucide/svelte/icons/workflow';
import type { LucideIcon } from '@scylla/ui';

/** The version that announced a highlight: the version of its "seen" flag. */
export type HighlightVersion = '0.7.0' | '0.7.2';

export interface ReleaseHighlight {
  /** Also the key of its "seen" flag in `localStorage`. */
  id: string;
  /** Never change it: the people who saw the highlight keep their flag. */
  since: HighlightVersion;
  title: MessageDescriptor;
  description: MessageDescriptor;
  icon: LucideIcon;
  /** The sidebar entry that shows a "New" badge until the user opens it. */
  navUrl?: string;
}

export interface ReleaseGroup {
  since: HighlightVersion;
  title: MessageDescriptor;
}

export interface Release {
  /** The release line, in the title of the dialog. */
  line: string;
  /** Bump it to show the dialog again. It is the version of the flag of the dialog. */
  version: string;
  /** The groups of the dialog, in order: the newest first. */
  groups: readonly ReleaseGroup[];
  highlights: readonly ReleaseHighlight[];
}

/** The release announcement: the first-launch dialog and the sidebar badges come from it. */
export const WHATS_NEW = {
  line: '0.7',
  version: '0.7.2',
  groups: [
    { since: '0.7.2', title: msg`New in 0.7.1 and 0.7.2` },
    { since: '0.7.0', title: msg`0.7.0` },
  ],
  highlights: [
    {
      id: 'pipelines-together',
      since: '0.7.2',
      title: msg`Scylla pipelines and file pipelines together`,
      description: msg`One list shows both, with a badge for the source. An admin can allow Git events (push, pull request, tag) for a Scylla pipeline.`,
      icon: GitMerge,
    },
    {
      id: 'start-node-triggers',
      since: '0.7.2',
      title: msg`Triggers from the start node`,
      description: msg`Click the start node of a pipeline to see, add and edit its triggers.`,
      icon: Workflow,
    },
    {
      id: 'log-viewer',
      since: '0.7.2',
      title: msg`A new log viewer`,
      description: msg`Read the logs next to the nodes, with colors, search and a jump to the errors. Share a link to a line, go full screen, follow the end and change the text size.`,
      icon: ScrollText,
    },
    {
      id: 'agent-labels',
      since: '0.7.2',
      title: msg`Agent labels`,
      description: msg`Label your agents and choose the labels of a pipeline when you create it. The job page tells why a job waits.`,
      icon: Tags,
    },
    {
      id: 'command-bar-search',
      since: '0.7.2',
      title: msg`Find anything fast`,
      description: msg`The command bar (Ctrl K) underlines what matches your text. A short tour shows how it works.`,
      icon: Search,
    },
    {
      id: 'dashboard-links',
      since: '0.7.2',
      title: msg`Dashboards you can click`,
      description: msg`The items of a widget, such as a pipeline, a run or an agent, open their page.`,
      icon: LayoutDashboard,
    },
    {
      id: 'copy-link',
      since: '0.7.2',
      title: msg`Copy a link`,
      description: msg`A button in the top bar of each page copies its link, to share it with your team.`,
      icon: Link,
    },
    {
      id: 'verify-email',
      since: '0.7.2',
      title: msg`Sign-up mail`,
      description: msg`If the mail to verify your address does not come, send the link again.`,
      icon: MailCheck,
    },
    {
      id: 'conditional-nodes',
      since: '0.7.0',
      title: msg`Pipelines that branch`,
      description: msg`The If, Switch and Merge nodes choose the next nodes from a value or the output of a node. A node that fails can send its error to a port.`,
      icon: Split,
    },
    {
      id: 'library',
      since: '0.7.0',
      title: msg`A library of fragments`,
      description: msg`Save a group of nodes as a fragment, then use it in each pipeline of the workspace. A new version is proposed, never forced.`,
      icon: LibraryBig,
      navUrl: 'library',
    },
    {
      id: 'marketplace',
      since: '0.7.0',
      title: msg`The marketplace`,
      description: msg`Browse the fragments that teams publish on the Scylla marketplace, and add one to your library: linked, to get its new versions, or as a copy that you own.`,
      icon: Store,
      navUrl: 'marketplace',
    },
    {
      id: 'command-bar',
      since: '0.7.0',
      title: msg`A command bar`,
      description: msg`Press Ctrl K to find a page, a project, a pipeline, an agent or a person, even with a typing error. It also runs a pipeline and changes the theme.`,
      icon: Search,
    },
    {
      id: 'notifications-inbox',
      since: '0.7.0',
      title: msg`An inbox`,
      description: msg`The bell shows your notifications. Accept an invitation in its row, and see the failed runs of your workspace.`,
      icon: Bell,
      navUrl: 'notifications',
    },
    {
      id: 'machines',
      since: '0.7.0',
      title: msg`Agents and apps under Machines`,
      description: msg`Connect an agent in three steps. An app takes a token, a CI identity or a key pair, and shows its last use.`,
      icon: Server,
    },
    {
      id: 'git-integrations',
      since: '0.7.0',
      title: msg`GitHub and GitLab`,
      description: msg`Connect a repository to a project, run a pipeline from a file of the repository, and export a pipeline as TOML, YAML or JSON.`,
      icon: GitBranch,
    },
    {
      id: 'new-look',
      since: '0.7.0',
      title: msg`A new look`,
      description: msg`A double sidebar that you can resize, new colors and fonts, and your theme and language on each of your devices.`,
      icon: Palette,
    },
  ],
} satisfies Release;
