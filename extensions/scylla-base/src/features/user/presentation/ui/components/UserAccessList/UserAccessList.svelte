<script lang="ts">
  import Building2Icon from '@lucide/svelte/icons/building-2';
  import GlobeIcon from '@lucide/svelte/icons/globe';
  import { organizationUrl } from '@platform/context';
  import { Badge, Skeleton } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import {
    groupUserAccess,
    type UserAccess,
  } from '../../../../domain/structs/user-access.struct.ts';
  import { userMessages } from '../../user.messages.ts';

  interface Props {
    access: UserAccess[] | undefined;
    isLoading?: boolean;
    isError?: boolean;
  }

  let { access, isLoading = false, isError = false }: Props = $props();

  const grouped = $derived(groupUserAccess(access ?? []));
</script>

{#snippet roles(grants: UserAccess[])}
  <ul class="flex flex-wrap gap-2">
    {#each grants as grant (grant.grantId)}
      <li class="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
        <span class="font-medium">{grant.roleName}</span>
        {#if grant.scope === 'project'}
          <Badge variant="secondary">{t(userMessages.projectRole(grant.projectName))}</Badge>
        {:else if grant.scope === 'organization'}
          <Badge variant="outline">{t(userMessages.organizationRole)}</Badge>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

{#if isLoading}
  <Skeleton class="h-24 w-full rounded-lg" />
{:else if isError}
  <p class="text-sm text-destructive">{t(userMessages.accessLoadError)}</p>
{:else if grouped.system.length === 0 && grouped.organizations.length === 0}
  <p class="text-sm text-muted-foreground">{t(userMessages.noAccess)}</p>
{:else}
  <div class="flex flex-col gap-5">
    {#if grouped.system.length > 0}
      <div class="flex flex-col gap-2">
        <h3 class="flex items-center gap-2 text-sm font-semibold">
          <GlobeIcon class="size-4 text-muted-foreground" />
          {t(userMessages.system)}
        </h3>
        {@render roles(grouped.system)}
      </div>
    {/if}

    {#each grouped.organizations as organization (organization.organizationId)}
      <div class="flex flex-col gap-2">
        <h3 class="flex items-center gap-2 text-sm font-semibold">
          <Building2Icon class="size-4 text-muted-foreground" />
          <a
            href={organizationUrl(organization.organizationName)}
            class="underline-offset-4 hover:underline"
          >
            {organization.organizationName}
          </a>
        </h3>
        {@render roles(organization.grants)}
      </div>
    {/each}
  </div>
{/if}
