import { msg } from '@lingui/core/macro';
import SparklesIcon from '@lucide/svelte/icons/sparkles';
import type { ActionCommand } from '@scylla/core-sdk';
import { layoutMessages } from './messages/layout.messages.ts';
import { reopenRelease } from './whats-new.state.svelte.ts';

/** The same entry as the user menu: it opens the notes of the release again. */
export const whatsNewCommands: readonly ActionCommand[] = [
  {
    id: 'shell.whats-new',
    kind: 'action',
    title: layoutMessages.whatsNewMenu,
    keywords: msg`release notes changelog news version updates`,
    icon: SparklesIcon,
    run: reopenRelease,
  },
];
