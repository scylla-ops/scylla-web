<script lang="ts">
  import ScyllaDialog from './ScyllaDialog.svelte';

  let {
    dismissible = true,
    ...rest
  }: { dismissible?: boolean | 'button'; [dataAttribute: `data-${string}`]: unknown } = $props();

  let open = $state(true);
</script>

<button onclick={() => (open = true)}>Open</button>
<ScyllaDialog {...rest} {open} onOpenChange={next => (open = next)} {dismissible} title="Add member">
  <input aria-label="Email" />
  <button onclick={() => (open = false)}>Done</button>
</ScyllaDialog>
