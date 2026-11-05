import type { NavGroup } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import UsersRoundIcon from '@lucide/svelte/icons/users-round';

/** The members and the roles of a workspace are one item of the rail. */
export const ACCESS_NAV: NavGroup = { id: 'access', title: msg`Access`, icon: UsersRoundIcon };
