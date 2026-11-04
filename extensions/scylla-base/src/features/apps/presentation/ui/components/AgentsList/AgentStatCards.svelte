<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import type { AgentSummary } from '@base/features/apps/domain/structs/agent-list.struct.ts';
  import {
    endedJobs,
    successRate,
    type JobOutcomes,
  } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
  import { agentsListMessages as messages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';

  interface Props {
    summary: AgentSummary;
    /** `null` while the stats load. */
    outcomes: JobOutcomes | null;
  }

  let { summary, outcomes }: Props = $props();

  const attention = $derived(summary.offline + summary.never);
  const rate = $derived(outcomes ? successRate(outcomes) : null);
</script>

<dl class="grid grid-cols-2 overflow-hidden rounded-xl border lg:grid-cols-4">
  <div class="flex flex-col gap-2 border-b p-5 lg:border-r lg:border-b-0">
    <dt class="text-xs text-muted-foreground">{t(messages.online)}</dt>
    <dd class="text-xl font-medium">{t(messages.onlineOf(summary.online, summary.total))}</dd>
  </div>
  <div class="flex flex-col gap-2 border-b border-l p-5 lg:border-b-0">
    <dt class="text-xs text-muted-foreground">{t(messages.runningNow)}</dt>
    <dd class="text-xl font-medium">{t(messages.jobs(summary.runningJobs))}</dd>
  </div>
  <div class="flex flex-col gap-2 p-5 lg:border-x">
    <dt class="text-xs text-muted-foreground">{t(messages.needsAttention)}</dt>
    <dd class="flex flex-col gap-2">
      <span class="text-xl font-medium">{attention}</span>
      {#if attention > 0}
        <span class="text-xs text-muted-foreground">
          {t(messages.attentionDetail(summary.offline, summary.never))}
        </span>
      {/if}
    </dd>
  </div>
  <div class="flex flex-col gap-2 border-l p-5 lg:border-l-0">
    <dt class="text-xs text-muted-foreground">{t(messages.jobsLast30Days)}</dt>
    <dd class="flex flex-col gap-2">
      <span class="text-xl font-medium">{outcomes ? endedJobs(outcomes) : '–'}</span>
      {#if rate !== null}
        <span class="text-xs text-muted-foreground">
          {t(messages.passed(Math.round(rate * 100)))}
        </span>
      {/if}
    </dd>
  </div>
</dl>
