<script lang="ts">
  import { i18n } from '@lingui/core';
  import XIcon from '@lucide/svelte/icons/x';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import {
    accessMutations,
    accessQueries,
    type MemberRoleEntity,
    type ObjectRef,
  } from '@base/features/access';
  import { roleQueries, type RoleLevel } from '@base/features/roles';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button, Label } from '@scylla/ui/primitives';
  import { toast } from '@scylla/ui/utils';
  import { ScyllaError } from '@shared/utils/scylla-error.ts';
  import { changeTitle, membershipMessages } from '../../../messages/membership.messages.ts';
  import { memberRoleName } from '../../../presenters/member-role-name.ts';
  import { OWNER_KEY } from '../../../presenters/member-rows.presenter.ts';
  import RolePicker from '../RolePicker/RolePicker.svelte';

  interface Props {
    /** Absent: the dialog is closed. */
    actorId?: string;
    /** `people`, or `apps` for a machine. */
    holder?: 'people' | 'apps';
    name: string;
    /** The roles that the actor holds on the object. */
    roles: readonly MemberRoleEntity[];
    workspaceId: string;
    object: ObjectRef;
    onClose: () => void;
    onChanged: () => void;
    /** An app of another workspace: the server gives `ACTOR_OUTSIDE_WORKSPACE`. */
    onOutside?: () => void;
  }

  let {
    actorId,
    holder = 'people',
    name,
    roles,
    workspaceId,
    object,
    onClose,
    onChanged,
    onOutside,
  }: Props = $props();

  const level = $derived<RoleLevel>(object.kind === 'project' ? 'project' : 'workspace');
  const open = $derived(actorId !== undefined);
  const rolesQuery = createQuery(() => roleQueries.list(workspaceId, { enabled: open }));
  const catalogQuery = createQuery(() => ({ ...roleQueries.catalog(), enabled: open }));
  const heldQuery = createQuery(() => accessQueries.held(object, { enabled: open }));
  const grant = createMutation(() => ({
    ...accessMutations.grant(),
    meta: { showsOwnError: true },
  }));
  const revoke = createMutation(() => ({
    ...accessMutations.revoke(),
    meta: { showsOwnError: true },
  }));

  const options = $derived(
    (rolesQuery.data ?? []).filter(role => role.level === level && role.holder === holder),
  );
  const held = $derived(roles.filter(role => role.roleKey !== OWNER_KEY));
  const owner = $derived(roles.some(role => role.roleKey === OWNER_KEY));

  let next = $state('');
  let pending = $state(false);
  let failure = $state<string | null>(null);

  const change = async (run: () => Promise<unknown>) => {
    pending = true;
    failure = null;
    try {
      await run();
      toast.success(i18n._(membershipMessages.rolesChanged));
      onChanged();
    } catch (thrown) {
      const error = ScyllaError.from(thrown);
      if (error.reason === 'ACTOR_OUTSIDE_WORKSPACE' && onOutside) onOutside();
      else failure = error.userMessage();
    } finally {
      pending = false;
    }
  };

  const add = () => {
    if (!actorId || !next) return;
    const [role, actor] = [next, actorId];
    next = '';
    void change(() => grant.mutateAsync({ object, role, actorId: actor }));
  };

  const take = (role: MemberRoleEntity) => {
    if (!actorId) return;
    const actor = actorId;
    void change(() => revoke.mutateAsync({ object, role: role.role, actorId: actor }));
  };
</script>

<ScyllaDialog
  {open}
  onOpenChange={value => {
    if (!value) onClose();
  }}
  title={t(changeTitle(name))}
>
  <div class="flex flex-col gap-4">
    {#if owner}
      <p class="text-xs text-muted-foreground">{t(membershipMessages.ownerStays)}</p>
    {/if}
    <ul class="flex flex-col gap-2">
      {#each held as role (role.role)}
        <li class="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
          {memberRoleName(role)}
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            aria-label={t(membershipMessages.removeRow)}
            onclick={() => take(role)}
          >
            <XIcon class="size-4" />
          </Button>
        </li>
      {/each}
    </ul>
    <div class="flex flex-col gap-2">
      <Label>{t(membershipMessages.addRole)}</Label>
      <div class="flex items-center gap-2">
        <RolePicker
          roles={options.filter(role => !held.some(one => one.role === role.grantName))}
          value={next}
          held={heldQuery.data}
          areas={catalogQuery.data ?? []}
          label={t(membershipMessages.addRole)}
          onChange={value => (next = value)}
        />
        <Button disabled={!next || pending} onclick={add}>{t(membershipMessages.add)}</Button>
      </div>
    </div>
    {#if failure}
      <p class="text-sm text-destructive" role="alert">{failure}</p>
    {/if}
    <div class="flex justify-end">
      <Button variant="outline" onclick={onClose}>{t(membershipMessages.close)}</Button>
    </div>
  </div>
</ScyllaDialog>
