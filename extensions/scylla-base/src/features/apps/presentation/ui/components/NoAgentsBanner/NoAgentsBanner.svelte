<script lang="ts">
  import type { Snippet } from 'svelte';
  import { can, Permission } from '@platform/authz';
  import { scyllaNavigate, contextStore } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import { appsMessages } from '@base/features/apps/presentation/messages/apps.messages.ts';

  interface Props {
    hasPendingJobs: boolean;
  }

  let { hasPendingJobs }: Props = $props();

  const context = toRune(contextStore);
  const workspaceId = $derived(context().organization.id ?? '');

  // Checked again: without the permission the banner says something else.
  const canListAgents = $derived(
    can(Permission.LIST_AGENTS, { organizationId: workspaceId || undefined }),
  );

  const agentsQuery = createQuery(() => appQueries.runners(workspaceId));
  const anyConnected = $derived((agentsQuery.data ?? []).some(agent => agent.connected));
</script>

<!--
  Shown when jobs are queued and no agent is connected. Without the right to list the apps,
  the connection is unknown: the banner only points at the agents.
-->
{#snippet banner(children: Snippet)}
  <div class="flex items-center gap-2.5 rounded-md border px-3 py-2 text-xs text-muted-foreground">
    <span class="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-warning"></span>
    {@render children()}
  </div>
{/snippet}

{#if hasPendingJobs && !agentsQuery.isLoading}
  {#if !canListAgents}
    {@render banner(cannotLook)}
  {:else if !anyConnected}
    {@render banner(noneConnected)}
  {/if}
{/if}

{#snippet cannotLook()}
  <span>{t(appsMessages.jobsQueuedCheckAgents)}</span>
{/snippet}

{#snippet noneConnected()}
  <span>{t(appsMessages.noAgentConnected)}</span>
  <button
    type="button"
    onclick={() => scyllaNavigate.goToOrgRoute('/apps')}
    class="ml-auto shrink-0 font-medium text-primary hover:underline"
  >
    {t(appsMessages.setUpAnAgent)} →
  </button>
{/snippet}
