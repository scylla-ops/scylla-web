<script lang="ts">
  import CalendarRangeIcon from '@lucide/svelte/icons/calendar-range';
  import { SegmentedControl } from '@scylla/ui';
  import { Button, Popover, PopoverContent, PopoverTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { dashboardMessages as messages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
  import {
    customPeriodLabel,
    periodOptions,
  } from '@base/features/dashboard/presentation/presenters/period-options.presenter.ts';
  import type {
    DashboardPeriod,
    PeriodKind,
  } from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
  import type { Day } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import CustomPeriodForm from './CustomPeriodForm.svelte';

  interface Props {
    period: DashboardPeriod;
    /** Today in the time zone of the workspace: the last day that a custom period can hold. */
    today: () => Day;
    onSelect: (kind: PeriodKind) => void;
    onApplyCustom: (from: Day, to: Day) => void;
  }

  let { period, today, onSelect, onApplyCustom }: Props = $props();

  let open = $state(false);

  const options = $derived(periodOptions());

  const select = (kind: PeriodKind) => {
    onSelect(kind);
    open = kind === 'custom';
  };
</script>

<div class="flex flex-wrap items-center gap-2">
  <SegmentedControl
    size="sm"
    aria-label={t(messages.period)}
    value={period.kind}
    {options}
    onChange={select}
  />
  {#if period.kind === 'custom'}
    <Popover bind:open>
      <PopoverTrigger>
        {#snippet child({ props })}
          <Button variant="outline" size="sm" {...props}>
            <CalendarRangeIcon aria-hidden="true" />
            {customPeriodLabel(period.from, period.to)}
          </Button>
        {/snippet}
      </PopoverTrigger>
      <PopoverContent align="end" class="w-auto">
        <CustomPeriodForm
          from={period.from}
          to={period.to}
          today={today()}
          onApply={(from, to) => {
            onApplyCustom(from, to);
            open = false;
          }}
        />
      </PopoverContent>
    </Popover>
  {/if}
</div>
