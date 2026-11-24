import { msg } from '@lingui/core/macro';
import LogOutIcon from '@lucide/svelte/icons/log-out';
import type { ConfirmCommand } from '@scylla/core-sdk';
import { signOut } from './sign-out.ts';

export const loginCommands: readonly ConfirmCommand[] = [
  {
    id: 'login.sign-out',
    kind: 'confirm',
    title: msg`Sign out`,
    keywords: msg`log out logout disconnect session`,
    icon: LogOutIcon,
    type: msg`Session`,
    verb: msg`Sign out`,
    question: msg`Sign out of Scylla?`,
    detail: msg`The session closes on this device. You go back to the sign-in page.`,
    run: signOut,
  },
];
