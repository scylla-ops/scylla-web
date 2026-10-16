<script lang="ts">
  import { Card, TableBody, TableHead, TableHeader, TableRow } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type {
    AgentActions,
  } from '@base/features/agents/presentation/ui/components/agent-actions.state.svelte.ts';
  import type {
    AgentRow as AgentRowData,
  } from './agents-page.state.svelte.ts';
  import AgentRow from './AgentRow.svelte';
  import { agentsPageMessages as messages } from './agents-page.messages.ts';

  interface Props {
    rows: AgentRowData[];
    organizationId: string;
    now: number;
    actions: AgentActions;
    canReadStats: boolean;
    canReadAccess: boolean;
  }

  let { rows, organizationId, now, actions, canReadStats, canReadAccess }: Props = $props();

  const HEAD = 'h-10 text-xs font-medium normal-case tracking-normal';
</script>

<Card class="gap-0 overflow-hidden py-0">
  <div class="relative overflow-x-auto">
    <table class="w-full caption-bottom text-sm">
      <TableHeader class="bg-muted/40">
        <TableRow class="hover:bg-transparent">
          <TableHead class={HEAD}>{t(messages.columnAgent)}</TableHead>
          <TableHead class={HEAD}>{t(messages.columnHost)}</TableHead>
          <TableHead class={HEAD}>{t(messages.columnAccess)}</TableHead>
          <TableHead class={HEAD}>{t(messages.columnJobs)}</TableHead>
          <TableHead class={HEAD}>{t(messages.columnActivity)}</TableHead>
          <TableHead class="w-12"><span class="sr-only">{t(messages.columnActions)}</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each rows as row (row.agent.id)}
          <AgentRow {row} {organizationId} {now} {actions} {canReadStats} {canReadAccess} />
        {/each}
      </TableBody>
    </table>
  </div>
  {#if rows.length === 0}
    <p class="px-6 py-10 text-center text-sm text-muted-foreground">{t(messages.noMatch)}</p>
  {/if}
</Card>
