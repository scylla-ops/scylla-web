<script lang="ts">
  import SegmentedControl from './SegmentedControl.svelte';
  import type { SegmentedOption } from './segmented-control.ts';

  interface Props {
    options: readonly SegmentedOption[];
    initial: string;
    onChange?: (value: string) => void;
    fill?: boolean;
  }

  let { options, initial, onChange, fill }: Props = $props();

  // svelte-ignore state_referenced_locally
  let value = $state(initial);
</script>

<SegmentedControl
  {value}
  {options}
  {fill}
  aria-label="Status"
  onChange={next => {
    value = next;
    onChange?.(next);
  }}
/>
