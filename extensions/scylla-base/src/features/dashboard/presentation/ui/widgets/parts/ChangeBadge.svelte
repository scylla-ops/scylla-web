<script lang="ts">
  import { ChartDelta } from '@scylla/ui';
  import type { ChangeView } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';

  interface Props {
    change: ChangeView | null;
  }

  let { change }: Props = $props();
</script>

{#if change}
  <ChartDelta label={change.label} direction={change.direction} tone={change.tone} />
{/if}
