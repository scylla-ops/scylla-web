<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import CreateAgentFlow from './CreateAgentFlow.svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  /** The flow of this opening. Svelte sets it to `null` when the flow goes. */
  let flow = $state.raw<ReturnType<typeof CreateAgentFlow> | null>(null);
</script>

<ScyllaDialog
  {open}
  onOpenChange={next => {
    if (!next) onClose();
  }}
  dismissible={flow?.dismissible() ?? true}
  class="w-[calc(100vw-2rem)] gap-0 p-0 sm:max-w-[560px]"
>
  <CreateAgentFlow bind:this={flow} {onClose} />
</ScyllaDialog>
