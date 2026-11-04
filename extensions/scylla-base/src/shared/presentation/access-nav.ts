import type { NavGroup } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';

/** The members and the roles of a workspace fold under one item of the sidebar. */
export const ACCESS_NAV: NavGroup = { id: 'access', title: msg`Access`, icon: ShieldCheckIcon };
