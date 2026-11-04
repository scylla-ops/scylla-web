<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import {
    Badge,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { ownerMutations, ownerQueries } from '@base/features/workspace';
  import type { UserSummary } from '@base/features/user';
  import { userName } from '@shared/presentation/ui';
  import { membershipMessages } from '@base/features/membership/presentation/messages/membership.messages.ts';

  interface Props {
    workspaceId: string;
    /** The people of the workspace: an owner comes from them. */
    members: readonly UserSummary[];
    /** `add_owner` and `remove_owner`: the owners only. */
    canManage: boolean;
  }

  let { workspaceId, members, canManage }: Props = $props();

  const owners = createQuery(() => ownerQueries.list(workspaceId));
  const add = createMutation(() => ownerMutations.add());
  const remove = createMutation(() => ownerMutations.remove());

  const ownerIds = $derived(new Set((owners.data ?? []).map(owner => owner.userId)));
  const candidates = $derived(members.filter(member => !ownerIds.has(member.id)));
  // The last owner stays: the server refuses with LAST_OWNER, the button says so first.
  const canRemove = $derived(canManage && (owners.data?.length ?? 0) > 1);

  /** Back to the placeholder after each pick. */
  let value = $state('');
</script>

<Card>
  <CardHeader>
    <CardTitle><h2>{t(membershipMessages.owners)}</h2></CardTitle>
    <CardDescription>{t(membershipMessages.ownersDescription)}</CardDescription>
  </CardHeader>
  <CardContent class="flex flex-wrap items-center gap-2">
    {#each owners.data ?? [] as owner (owner.userId)}
      <Badge variant="secondary" class="gap-1">
        {owner.displayName || owner.userId}
        {#if canRemove}
          <button
            type="button"
            aria-label={t(membershipMessages.removeOwner(owner.displayName || owner.userId))}
            disabled={remove.isPending}
            onclick={() => remove.mutate({ workspaceId: workspaceId, userId: owner.userId })}
          >
            <XIcon class="size-3" />
          </button>
        {/if}
      </Badge>
    {/each}
    {#if canManage && candidates.length > 0}
      <Select
        type="single"
        bind:value
        disabled={add.isPending}
        onValueChange={userId => {
          if (!userId) return;
          value = '';
          add.mutate({ workspaceId: workspaceId, userId });
        }}
      >
        <SelectTrigger size="sm" class="w-auto border-dashed text-xs">
          <SelectValue placeholder={t(membershipMessages.addOwner)} />
        </SelectTrigger>
        <SelectContent>
          {#each candidates as member (member.id)}
            <SelectItem value={member.id} label={userName(member)}>{userName(member)}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    {/if}
  </CardContent>
</Card>
