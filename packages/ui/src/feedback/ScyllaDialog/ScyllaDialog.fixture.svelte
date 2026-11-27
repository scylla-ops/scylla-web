<script lang="ts">
  import ScyllaDialog from './ScyllaDialog.svelte';

  let {
    dismissible = true,
    stable,
    ...rest
  }: { dismissible?: boolean | 'button'; stable?: number; [dataAttribute: `data-${string}`]: unknown } = $props();

  let open = $state(true);
</script>

<button onclick={() => (open = true)}>Open</button>
<ScyllaDialog {...rest} {open} onOpenChange={next => (open = next)} {dismissible} {stable} title="Add member">
  <input aria-label="Email" />
  <button onclick={() => (open = false)}>Done</button>
</ScyllaDialog>
