<script lang="ts">
  import { Checkbox } from '@scylla/ui/primitives';

  interface Props {
    label: string;
    /** The packages that the option keeps. */
    count: number;
    checked: boolean;
    onToggle: () => void;
  }

  let { label, count, checked, onToggle }: Props = $props();
</script>

<label class="flex items-center gap-2">
  <Checkbox {checked} onCheckedChange={onToggle} />
  <span class="flex-1">{label}</span>
  <span class="text-xs text-muted-foreground tabular-nums">{count}</span>
</label>
