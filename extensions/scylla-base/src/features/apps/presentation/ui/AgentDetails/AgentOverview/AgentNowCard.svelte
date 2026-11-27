<script lang="ts">
  import { ChartSlot } from '@scylla/ui';
  import { Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { AppEntity, AppJob } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import AgentJobRow from '../AgentJobRow.svelte';

  interface Props {
    agent: AppEntity;
    /** The newest jobs: the running ones show here. `undefined` while they load. */
    jobs: AppJob[] | undefined;
    projectName: (id: string) => string;
  }

  let { agent, jobs, projectName }: Props = $props();

  /** More slots would not fit on a phone. */
  const MAX_SLOTS = 16;

  const capacity = $derived(agent.host?.capacity ?? 0);
  const busy = $derived(Math.min(agent.runningJobs, capacity));
  const slots = $derived(Array.from({ length: Math.min(capacity, MAX_SLOTS) }, (_, i) => i));
  const running = $derived((jobs ?? []).filter(job => job.status === 'running'));
  const slotState = (slot: number) =>
    !agent.connected ? 'offline' : slot < busy ? 'busy' : 'free';
</script>

<!-- What the agent does now: its slots, the jobs that run, and its last contact. -->
<Card class="gap-4">
  <CardHeader class="flex flex-row items-center justify-between gap-3">
    <CardTitle><h2>{t(messages.now)}</h2></CardTitle>
    {#if agent.lastSeenAt}
      <span class="text-xs text-muted-foreground">
        {t(messages.lastContact(getRelativeTime(agent.lastSeenAt)))}
      </span>
    {/if}
  </CardHeader>
  <CardContent class="flex flex-col gap-3">
    {#if capacity > 0}
      <div class="flex flex-wrap items-center gap-3">
        <span class="flex items-center gap-1" aria-hidden="true">
          {#each slots as slot (slot)}
            <ChartSlot state={slotState(slot)} />
          {/each}
        </span>
        <span class="text-sm">{t(messages.slotsBusy(busy, capacity))}</span>
      </div>
    {/if}
    {#if running.length > 0}
      <ul class="flex flex-col gap-1">
        {#each running as job (job.id)}
          <AgentJobRow {job} projectName={projectName(job.projectId)} />
        {/each}
      </ul>
    {:else}
      <p class="text-sm text-muted-foreground">
        {t(agent.connected ? messages.waitingForJob : messages.noJobNow)}
      </p>
    {/if}
  </CardContent>
</Card>
