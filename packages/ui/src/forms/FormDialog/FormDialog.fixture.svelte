<!-- Pins the id generic of `FormDialog`. -->
<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import FormDialog from './FormDialog.svelte';

  let { open, ...props }: ComponentProps<typeof FormDialog<'name'>> = $props();

  // A `rerender` gives all the props again, and `ScyllaDialog` would read it as a new opening and
  // build its content again. The dialog of a test opens once.
  // svelte-ignore state_referenced_locally
  const opened = $state(open);
</script>

<FormDialog open={opened} {...props} />
