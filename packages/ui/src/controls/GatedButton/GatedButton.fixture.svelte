<script lang="ts">
  import ScyllaDialog from '../../feedback/ScyllaDialog/ScyllaDialog.svelte';
  import { Button } from '../../primitives/index.ts';
  import GatedButton from './GatedButton.svelte';

  interface Props {
    onSubmit: () => void;
  }

  let { onSubmit }: Props = $props();

  let open = $state(false);
  let allowed = $state(true);
</script>

<!-- A denied submit button in a form, and a button whose dialog denies it on close. -->
<form
  onsubmit={event => {
    event.preventDefault();
    onSubmit();
  }}
>
  <GatedButton type="submit" allowed={false} deniedReason="Read only.">Save</GatedButton>
</form>

<GatedButton {allowed} deniedReason="Already done." onclick={() => (open = true)}>Add</GatedButton>
<ScyllaDialog {open} onOpenChange={next => (open = next)} title="Add it">
  <Button
    onclick={() => {
      allowed = false;
      open = false;
    }}
  >
    Do it
  </Button>
</ScyllaDialog>
