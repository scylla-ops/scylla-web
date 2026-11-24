<script lang="ts">
  import type { MemberRoleEntity, ObjectRef } from '@base/features/access';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { changeTitle, membershipMessages } from '../../../messages/membership.messages.ts';
  import ChangeRolesForm from './ChangeRolesForm.svelte';

  interface Props {
    /** Absent: the dialog is closed. */
    actorId?: string;
    /** `people`, or `apps` for a machine. */
    holder?: 'people' | 'apps';
    name: string;
    /** The name of the object. */
    scopeName: string;
    /** The roles that the actor holds on the object now: derive them from a query, never a copy. */
    roles: readonly MemberRoleEntity[];
    /** The roles of the actor in other scopes. They show, and they change on another page. */
    otherRoles?: readonly MemberRoleEntity[];
    workspaceId: string;
    object: ObjectRef;
    onClose: () => void;
    /** The checklist ignores a click until a returned promise settles: return the reload. */
    onChanged: () => unknown;
    /** An app of another workspace: the server gives `ACTOR_OUTSIDE_WORKSPACE`. */
    onOutside?: () => void;
  }

  let {
    actorId,
    holder = 'people',
    name,
    scopeName,
    roles,
    otherRoles = [],
    workspaceId,
    object,
    onClose,
    onChanged,
    onOutside,
  }: Props = $props();
</script>

<ScyllaDialog
  open={actorId !== undefined}
  onOpenChange={value => {
    if (!value) onClose();
  }}
  title={t(changeTitle(name))}
  description={t(membershipMessages.eachChangeApplies)}
>
  <ChangeRolesForm
    actorId={actorId ?? ''}
    {holder}
    {name}
    {scopeName}
    {roles}
    {otherRoles}
    {workspaceId}
    {object}
    {onClose}
    {onChanged}
    {onOutside}
  />
</ScyllaDialog>
