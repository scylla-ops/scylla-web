<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import {
    Badge,
    Card,
    Skeleton,
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
  import XIcon from '@lucide/svelte/icons/x';
  import {
    WORKSPACE_ROLES,
    accessMutations,
    accessQueries,
    roleLabel,
    workspaceRef,
  } from '@base/features/access';
  import { appsMessages } from '@base/features/apps/presentation/messages/apps.messages.ts';

  interface Props {
    appId: string;
    workspaceId: string;
    /** `list_access` on the workspace. */
    canRead: boolean;
    /** `grant` and `revoke` on the workspace. */
    canManage: boolean;
  }

  let { appId, workspaceId, canRead, canManage }: Props = $props();

  const object = $derived(workspaceRef(workspaceId));
  const access = createQuery(() => accessQueries.list(object, { enabled: canRead }));
  const grant = createMutation(() => accessMutations.grant());
  const revoke = createMutation(() => accessMutations.revoke());

  const held = $derived(
    (access.data ?? []).filter(entry => entry.actorId === appId).map(entry => entry.role),
  );
  const addable = $derived(WORKSPACE_ROLES.filter(role => !held.includes(role)));

  /** Back to the placeholder after each pick. */
  let value = $state('');
</script>

{#if canRead}
  <Card>
    <CardHeader>
      <CardTitle><h2>{t(appsMessages.roles)}</h2></CardTitle>
      <CardDescription>{t(appsMessages.rolesDescription)}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-wrap items-center gap-2">
      {#if access.isPending}
        <Skeleton class="h-6 w-20 rounded-full" />
        <Skeleton class="h-6 w-24 rounded-full" />
      {:else if held.length === 0}
        <p class="text-sm text-muted-foreground">{t(appsMessages.noRoles)}</p>
      {/if}
      {#each held as role (role)}
        <Badge variant="secondary" class="gap-1">
          {roleLabel(role)}
          {#if canManage}
            <button
              type="button"
              aria-label={t(appsMessages.removeRole(roleLabel(role)))}
              disabled={revoke.isPending}
              onclick={() => revoke.mutate({ object, role, actorId: appId })}
            >
              <XIcon class="size-3" />
            </button>
          {/if}
        </Badge>
      {/each}
      {#if canManage && addable.length > 0}
        <Select
          type="single"
          bind:value
          disabled={grant.isPending}
          onValueChange={role => {
            if (!role) return;
            value = '';
            grant.mutate({ object, role, actorId: appId });
          }}
        >
          <SelectTrigger size="sm" class="w-auto border-dashed text-xs">
            <SelectValue placeholder={t(appsMessages.addRole)} />
          </SelectTrigger>
          <SelectContent>
            {#each addable as role (role)}
              <SelectItem value={role} label={roleLabel(role)}>{roleLabel(role)}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      {/if}
    </CardContent>
  </Card>
{/if}
