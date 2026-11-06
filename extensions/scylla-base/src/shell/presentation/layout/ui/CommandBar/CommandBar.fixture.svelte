<script lang="ts">
  import type { CommandForm } from '@scylla/core-sdk';
  import CommandBar from './CommandBar.svelte';

  let {
    openForm,
    onOpenChange,
  }: { openForm: (form: CommandForm) => void; onOpenChange: (open: boolean) => void } = $props();

  let open = $state(true);
</script>

<CommandBar
  {open}
  {openForm}
  onOpenChange={next => {
    open = next;
    onOpenChange(next);
  }}
/>
