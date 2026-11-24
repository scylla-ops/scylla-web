<script lang="ts">
  import { untrack } from 'svelte';
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { dashboardMessages as messages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
  import { customPeriodIssueText } from '@base/features/dashboard/presentation/presenters/period-options.presenter.ts';
  import { customPeriodIssue } from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
  import type { Day } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';

  interface Props {
    from: Day;
    to: Day;
    today: Day;
    onApply: (from: Day, to: Day) => void;
  }

  let { from, to, today, onApply }: Props = $props();

  let draftFrom = $state(untrack(() => from));
  let draftTo = $state(untrack(() => to));

  const id = $props.id();
  const issue = $derived(customPeriodIssue(draftFrom, draftTo, today));
  const issueText = $derived(customPeriodIssueText(issue));
</script>

<form
  class="grid gap-3"
  aria-labelledby="{id}-title"
  onsubmit={event => {
    event.preventDefault();
    if (!issue) onApply(draftFrom, draftTo);
  }}
>
  <h2 id="{id}-title" class="text-sm">{t(messages.chooseDays)}</h2>
  <div class="grid grid-cols-2 gap-3">
    <div class="grid gap-1.5">
      <Label for="{id}-from">{t(messages.firstDay)}</Label>
      <Input
        id="{id}-from"
        type="date"
        max={today}
        aria-invalid={issue === 'start-after-end' || undefined}
        bind:value={draftFrom}
      />
    </div>
    <div class="grid gap-1.5">
      <Label for="{id}-to">{t(messages.lastDay)}</Label>
      <Input
        id="{id}-to"
        type="date"
        max={today}
        aria-invalid={issue === 'end-in-future' || undefined}
        bind:value={draftTo}
      />
    </div>
  </div>
  {#if issueText}
    <p role="alert" class="text-xs text-destructive">{issueText}</p>
  {/if}
  <Button type="submit" size="sm" class="justify-self-end" disabled={!!issue}>
    {t(messages.apply)}
  </Button>
</form>
