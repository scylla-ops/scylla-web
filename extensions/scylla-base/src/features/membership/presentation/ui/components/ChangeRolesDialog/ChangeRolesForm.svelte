<script lang="ts">
  import { onDestroy } from 'svelte';
  import { can, Permission } from '@platform/authz';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import {
    accessMutations,
    accessQueries,
    type MemberRoleEntity,
    type ObjectRef,
  } from '@base/features/access';
  import { roleQueries, type RoleLevel } from '@base/features/roles';
  import { t } from '@scylla/ui/i18n';
  import { Button, Skeleton } from '@scylla/ui/primitives';
  import { toast } from '@scylla/ui/utils';
  import { ScyllaError } from '@shared/utils/scylla-error.ts';
  import {
    lastRoleWarning,
    membershipMessages,
    removeFrom,
    rolesIn,
  } from '../../../messages/membership.messages.ts';
  import {
    otherScopes,
    roleChoices,
    type RoleChoice,
  } from '../../../presenters/role-choices.presenter.ts';
  import OtherScopes from './OtherScopes.svelte';
  import RoleChoiceRow from './RoleChoiceRow.svelte';

  interface Props {
    actorId: string;
    holder: 'people' | 'apps';
    name: string;
    scopeName: string;
    roles: readonly MemberRoleEntity[];
    otherRoles: readonly MemberRoleEntity[];
    workspaceId: string;
    object: ObjectRef;
    onClose: () => void;
    onChanged: () => unknown;
    onOutside: (() => void) | undefined;
  }

  let {
    actorId,
    holder,
    name,
    scopeName,
    roles,
    otherRoles,
    workspaceId,
    object,
    onClose,
    onChanged,
    onOutside,
  }: Props = $props();

  const level = $derived<RoleLevel>(object.kind === 'project' ? 'project' : 'workspace');
  const rolesQuery = createQuery(() => roleQueries.list(workspaceId));
  const catalogQuery = createQuery(() => roleQueries.catalog());
  const heldQuery = createQuery(() => accessQueries.held(object));
  const grant = createMutation(() => ({
    ...accessMutations.grant(),
    meta: { showsOwnError: true },
  }));
  const revoke = createMutation(() => ({
    ...accessMutations.revoke(),
    meta: { showsOwnError: true },
  }));

  const loading = $derived(
    [rolesQuery.isLoading, catalogQuery.isLoading, heldQuery.isLoading].some(Boolean),
  );
  const choices = $derived(
    roleChoices(
      (rolesQuery.data ?? []).filter(role => role.level === level && role.holder === holder),
      roles,
      heldQuery.data,
      catalogQuery.data ?? [],
      can(Permission.MANAGE_OWNERS, { workspaceId }),
    ),
  );
  const others = $derived(otherScopes(otherRoles));

  let saving = $state<{ grantName: string; held: boolean } | null>(null);
  let confirming = $state<string | null>(null);
  let failure = $state<{ grantName: string; message: string } | null>(null);

  /** A refusal after a close has no row to show on. */
  let closed = false;
  onDestroy(() => (closed = true));

  const shownAsHeld = (choice: RoleChoice) =>
    saving?.grantName === choice.grantName ? saving.held : choice.held;

  /** The server takes the project roles of a person with the last workspace role. */
  const leavesWorkspace = (choice: RoleChoice) =>
    choice.held &&
    holder === 'people' &&
    object.kind === 'workspace' &&
    choices.filter(one => one.held).length === 1;

  const change = async (choice: RoleChoice) => {
    const held = !choice.held;
    confirming = null;
    failure = null;
    saving = { grantName: choice.grantName, held };
    const input = { object, role: choice.grantName, actorId };
    try {
      await (held ? grant : revoke).mutateAsync(input);
      await onChanged();
    } catch (thrown) {
      const error = ScyllaError.from(thrown);
      if (error.reason === 'ACTOR_OUTSIDE_WORKSPACE' && onOutside) onOutside();
      else if (closed) toast.error(error.userMessage());
      else failure = { grantName: choice.grantName, message: error.userMessage() };
    } finally {
      saving = null;
    }
  };

  const toggle = (choice: RoleChoice) => {
    if (confirming === choice.grantName) confirming = null;
    else if (leavesWorkspace(choice)) confirming = choice.grantName;
    else void change(choice);
  };
</script>

<div class="flex min-w-0 flex-col gap-4">
  <section class="flex flex-col gap-2">
    <h3 class="text-sm">{t(rolesIn(scopeName))}</h3>
    {#if loading}
      <div role="status" aria-busy="true" class="flex flex-col gap-2">
        {#each [0, 1, 2] as index (index)}
          <Skeleton class="h-16 w-full rounded-xl" />
        {/each}
      </div>
    {:else if choices.length === 0}
      <p class="text-sm text-muted-foreground">{t(membershipMessages.noRole)}</p>
    {:else}
      <ul
        class="relative flex max-h-[50vh] flex-col gap-2 overflow-y-auto"
        aria-busy={saving !== null}
      >
        {#each choices as choice (choice.grantName)}
          <RoleChoiceRow
            {choice}
            checked={shownAsHeld(choice)}
            busy={saving !== null}
            warning={confirming === choice.grantName ? t(lastRoleWarning(name, scopeName)) : null}
            confirmLabel={t(removeFrom(scopeName))}
            failure={failure?.grantName === choice.grantName ? failure.message : null}
            onToggle={() => toggle(choice)}
            onKeep={() => (confirming = null)}
            onConfirm={() => void change(choice)}
          />
        {/each}
      </ul>
    {/if}
  </section>

  {#if others.length > 0}
    <OtherScopes
      title={object.kind === 'workspace'
        ? t(membershipMessages.rolesOnProjects)
        : t(membershipMessages.rolesFromWorkspace)}
      scopes={others}
      {onClose}
    />
  {/if}

  <div class="flex justify-end">
    <Button variant="outline" onclick={onClose}>{t(membershipMessages.close)}</Button>
  </div>
</div>
