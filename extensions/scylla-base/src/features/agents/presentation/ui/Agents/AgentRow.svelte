<script lang="ts">
  import { Permission, can } from '@platform/authz';
  import { scyllaNavigate } from '@platform/context';
  import { Skeleton, TableCell, TableRow } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import type {
    AgentActions,
  } from '@base/features/agents/presentation/agent-actions.state.svelte.ts';
  import type { AgentRow } from '@base/features/agents/presentation/agents-page.state.svelte.ts';
  import {
    memoryAmount,
    shortId,
    versionTag,
  } from '@base/features/agents/presentation/utils/agent-format.ts';
  import AgentActionsMenu from '../components/AgentActionsMenu.svelte';
  import AgentBot from '../components/AgentBot/AgentBot.svelte';
  import { agentsMessages } from '../agents.messages.ts';
  import AccessBadges from './AccessBadges.svelte';
  import AgentActivity from './AgentActivity.svelte';
  import JobsSparkline from './JobsSparkline.svelte';
  import { agentsPageMessages as messages } from './agents-page.messages.ts';

  interface Props {
    row: AgentRow;
    organizationId: string;
    now: number;
    actions: AgentActions;
    canReadStats: boolean;
    canReadAccess: boolean;
  }

  let { row, organizationId, now, actions, canReadStats, canReadAccess }: Props = $props();

  const agent = $derived(row.agent);
  const host = $derived(agent.host);
  const canOpen = $derived(can(Permission.READ_APP));
  const dim = $derived(row.state === 'disabled' && 'opacity-60');

  const hostDetail = $derived.by(() => {
    if (!host) return '';
    const parts = [`${host.os}/${host.arch}`];
    if (host.cpuCount !== null) parts.push(t(agentsMessages.cpuCount(host.cpuCount)));
    if (host.totalMemoryMb !== null) {
      const { amount, unit } = memoryAmount(host.totalMemoryMb);
      const memory =
        unit === 'GB' ? agentsMessages.memoryGb(amount) : agentsMessages.memoryMb(amount);
      parts.push(t(memory));
    }
    return parts.join(' · ');
  });

  const open = () => {
    if (canOpen) scyllaNavigate.goToAgentDetails(agent.id);
  };
</script>

<TableRow class={cn(canOpen && 'cursor-pointer')} onclick={open} data-agent-id={agent.id}>
  <TableCell class={cn('py-3.5', dim)}>
    <div class="flex items-center gap-3">
      <AgentBot state={row.state} size="sm" />
      <div class="flex min-w-0 flex-col gap-0.5">
        <button
          type="button"
          class="truncate text-left text-sm font-medium hover:underline disabled:cursor-default disabled:no-underline"
          disabled={!canOpen}
          onclick={(event: MouseEvent) => {
            event.stopPropagation();
            open();
          }}
        >
          {agent.name}
        </button>
        <span class="font-mono text-xs text-muted-foreground" title={agent.id}>
          {shortId(agent.id)}
        </span>
      </div>
    </div>
  </TableCell>

  <TableCell class={dim || undefined}>
    {#if host}
      <div class="flex flex-col gap-1">
        <span class="flex items-center gap-2 text-sm">
          <span class="truncate">{host.hostname}</span>
          {#if host.version}
            <span class="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {versionTag(host.version)}
            </span>
          {/if}
        </span>
        <span class="text-xs text-muted-foreground">{hostDetail}</span>
      </div>
    {:else}
      <div class="flex flex-col gap-1">
        <span class="text-sm text-muted-foreground">{t(agentsMessages.notReportedYet)}</span>
        <span class="text-xs text-muted-foreground">{t(messages.sentAtFirstConnection)}</span>
      </div>
    {/if}
  </TableCell>

  <TableCell class={dim || undefined}>
    {#if !canReadAccess}
      <span class="text-xs text-muted-foreground">–</span>
    {:else if row.access}
      <AccessBadges access={row.access} {organizationId} />
    {:else}
      <Skeleton class="h-5 w-24 rounded-full" />
    {/if}
  </TableCell>

  <TableCell class={dim || undefined}>
    {#if !canReadStats}
      <span class="text-xs text-muted-foreground">–</span>
    {:else if row.stats}
      <JobsSparkline daily={row.stats.daily} />
    {:else}
      <Skeleton class="h-6 w-28" />
    {/if}
  </TableCell>

  <TableCell class={dim || undefined}>
    <AgentActivity
      {agent}
      state={row.state}
      {now}
      canReset={actions.canReset}
      onShowRunCommand={() => actions.requestReset(agent)}
    />
  </TableCell>

  <TableCell class="w-12 text-right">
    <AgentActionsMenu {agent} {actions} />
  </TableCell>
</TableRow>
