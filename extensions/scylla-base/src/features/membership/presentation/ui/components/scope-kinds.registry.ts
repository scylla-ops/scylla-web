import Building2Icon from '@lucide/svelte/icons/building-2';
import FolderIcon from '@lucide/svelte/icons/folder';
import type { MessageDescriptor } from '@lingui/core';
import type { MemberRoleEntity } from '@base/features/access';
import type { LucideIcon } from '@scylla/ui';
import { membershipMessages } from '../../messages/membership.messages.ts';

/** The icons are the ones of the workspace selector and of the project cards. */
export const SCOPE_KINDS: Record<
  MemberRoleEntity['scopeKind'],
  { icon: LucideIcon; label: MessageDescriptor }
> = {
  workspace: { icon: Building2Icon, label: membershipMessages.workspace },
  project: { icon: FolderIcon, label: membershipMessages.project },
};
