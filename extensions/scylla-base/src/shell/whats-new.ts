import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import MousePointer2 from '@lucide/svelte/icons/mouse-pointer-2';
import ShieldCheck from '@lucide/svelte/icons/shield-check';
import Smartphone from '@lucide/svelte/icons/smartphone';
import SquarePen from '@lucide/svelte/icons/square-pen';
import SquareTerminal from '@lucide/svelte/icons/square-terminal';
import UserCog from '@lucide/svelte/icons/user-cog';
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
  version: '0.6.0',
  highlights: [
    {
      id: 'scripting-by-node',
      title: msg`Scripting, node by node`,
      description: msg`The scripting tab lists the nodes of a pipeline by stage and shows the script of each node as shell code. Open two nodes side by side.`,
      icon: SquareTerminal,
    },
    {
      id: 'blueprint-drag-and-drop',
      title: msg`Drag and drop on the blueprint`,
      description: msg`See where a node lands while you drag it from the palette. A node that runs a template shows the icon of the template.`,
      icon: MousePointer2,
    },
    {
      id: 'safe-pipeline-save',
      title: msg`Safer pipeline saves`,
      description: msg`The pipeline editor tells you why it cannot save, for example two nodes with the same id. The blueprint refuses a link that closes a loop.`,
      icon: ShieldCheck,
    },
    {
      id: 'role-and-trigger-pages',
      title: msg`Roles and triggers on their own page`,
      description: msg`Create and edit a role or a trigger on a full page, with room for all of its permissions and settings.`,
      icon: SquarePen,
      navUrl: 'roles',
    },
    {
      id: 'account-settings',
      title: msg`A new account page`,
      description: msg`Profile, appearance, security and organizations: each setting has its own page. Choose your theme in Appearance.`,
      icon: UserCog,
    },
    {
      id: 'tables-on-phone',
      title: msg`Scylla on your phone`,
      description: msg`On a small screen, each row of a table shows as a card.`,
      icon: Smartphone,
    },
  ],
} satisfies Release;
