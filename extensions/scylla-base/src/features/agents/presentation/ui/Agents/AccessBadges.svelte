<script lang="ts">
  import Building2Icon from '@lucide/svelte/icons/building-2';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import GlobeIcon from '@lucide/svelte/icons/globe';
  import { Badge } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AppAccess } from '@base/features/apps';
  import {
    isOtherOrganization,
    orderGrants,
    projectLabel,
  } from '@base/features/agents/presentation/access.calculator.ts';
  import { agentsPageMessages as messages } from './agents-page.messages.ts';

  interface Props {
    access: AppAccess[];
    /** The organization on screen: a grant on another one names its organization. */
    organizationId: string;
  }

  let { access, organizationId }: Props = $props();

  const first = $derived(orderGrants(access, organizationId)[0]);
  const label = $derived.by(() => {
    if (!first) return '';
    if (first.scope === 'project') return projectLabel(first, organizationId);
    if (first.scope === 'system') return t(messages.allOrganizations);
    return isOtherOrganization(first, organizationId)
      ? t(messages.allProjectsOf(first.organizationName))
      : t(messages.allProjects);
  });
</script>

{#if !first}
  <span class="text-xs text-muted-foreground">{t(messages.noGrant)}</span>
{:else}
  <span class="flex items-center gap-1.5">
    <Badge variant="outline" class="max-w-48 font-normal" title={label}>
      {#if first.scope === 'project'}
        <FolderIcon />
      {:else if first.scope === 'organization'}
        <Building2Icon />
      {:else}
        <GlobeIcon />
      {/if}
      <span class="truncate">{label}</span>
    </Badge>
    {#if access.length > 1}
      <Badge variant="outline" class="font-normal text-muted-foreground">
        {t(messages.moreGrants(access.length - 1))}
      </Badge>
    {/if}
  </span>
{/if}
