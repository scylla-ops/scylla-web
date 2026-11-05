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
    Skeleton,
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
  import LastOwnerDialog from '../RefusalDialogs/LastOwnerDialog.svelte';

  interface Props {
    workspaceId: string;
    /** The people of the workspace: an owner comes from them. */
    members: readonly UserSummary[];
    /** `add_owner` and `remove_owner`: the owners only. */
    canManage: boolean;
    workspaceName: string;
  }

  let { workspaceId, members, canManage, workspaceName }: Props = $props();

  const owners = createQuery(() => ownerQueries.list(workspaceId));
  const add = createMutation(() => ownerMutations.add());
  const remove = createMutation(() => ownerMutations.remove());

  const ownerIds = $derived(new Set((owners.data ?? []).map(owner => owner.userId)));
  const candidates = $derived(members.filter(member => !ownerIds.has(member.id)));
  // The last owner stays: the server refuses with LAST_OWNER, and the dialog says so first.
  const isLast = $derived((owners.data?.length ?? 0) <= 1);
  let refused = $state<string | undefined>();

  /** Back to the placeholder after each pick. */
  let value = $state('');
</script>

<Card>
  <CardHeader>
    <CardTitle><h2>{t(membershipMessages.owners)}</h2></CardTitle>
    <CardDescription>{t(membershipMessages.ownersDescription)}</CardDescription>
  </CardHeader>
  <CardContent class="flex flex-wrap items-center gap-2">
    {#if owners.isPending}
      <Skeleton class="h-6 w-28 rounded-full" />
    {/if}
    {#each owners.data ?? [] as owner (owner.userId)}
      <Badge variant="secondary" class="gap-1">
        {owner.displayName || owner.userId}
        {#if canManage}
          <button
            type="button"
            aria-label={t(membershipMessages.removeOwner(owner.displayName || owner.userId))}
            disabled={remove.isPending}
            onclick={() => {
              if (isLast) refused = owner.displayName || owner.userId;
              else remove.mutate({ workspaceId: workspaceId, userId: owner.userId });
            }}
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

<LastOwnerDialog name={refused} {workspaceName} onClose={() => (refused = undefined)} />
