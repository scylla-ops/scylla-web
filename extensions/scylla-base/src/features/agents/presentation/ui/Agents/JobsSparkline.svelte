<script lang="ts">
  import { activeLocale, t } from '@scylla/ui/i18n';
  import type { DailyOutcome } from '@base/features/agents/domain/structs/agent.struct.ts';
  import {
    successRateOf,
    sumOutcomes,
  } from '@base/features/agents/presentation/presenters/agents-summary.presenter.ts';
  import { fillDays } from '@base/features/agents/presentation/presenters/daily-outcomes.presenter.ts';
  import { formatPercent } from '@base/features/agents/presentation/presenters/agent-format.presenter.ts';
  import { agentsPageMessages as messages } from '@base/features/agents/presentation/messages/agents-page.messages.ts';

  interface Props {
    daily: DailyOutcome[];
  }

  let { daily }: Props = $props();

  const HEIGHT = 24;

  const outcomes = $derived(sumOutcomes(daily));
  const rate = $derived(successRateOf(outcomes));
  const days = $derived(fillDays(daily));
  const peak = $derived(Math.max(1, ...days.map(day => day.completed + day.failed)));
</script>

{#if outcomes.total === 0}
  <span class="text-xs text-muted-foreground">{t(messages.noJobYet)}</span>
{:else}
  <div class="flex flex-col gap-1">
    <div
      class="flex items-end gap-px"
      style:height="{HEIGHT}px"
      role="img"
      aria-label={t(messages.sparkline(outcomes.total))}
    >
      {#each days as day (day.day)}
        {#if day.completed + day.failed === 0}
          <span class="h-px w-[3px] bg-muted-foreground/40"></span>
        {:else}
          <span class="flex w-[3px] flex-col-reverse">
            <span class="bg-success" style:height="{(day.completed / peak) * HEIGHT}px"></span>
            <span class="bg-destructive" style:height="{(day.failed / peak) * HEIGHT}px"></span>
          </span>
        {/if}
      {/each}
    </div>
    <span class="text-xs text-muted-foreground tabular-nums">
      {outcomes.total}
      {#if rate !== null}· {formatPercent(rate, activeLocale())}{/if}
    </span>
  </div>
{/if}
