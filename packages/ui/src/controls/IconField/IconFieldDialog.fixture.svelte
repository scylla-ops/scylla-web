<script lang="ts">
  import ScyllaDialog from '../../feedback/ScyllaDialog/ScyllaDialog.svelte';
  import type { IconChoice } from '../IconPicker/icon-picker.ts';
  import IconField from './IconField.svelte';

  interface Props {
    onsave?: (choice: IconChoice) => void;
  }

  let { onsave }: Props = $props();

  let open = $state(true);
  let value = $state<IconChoice>({ kind: 'default' });
</script>

<ScyllaDialog {open} onOpenChange={next => (open = next)} title="Edit workspace" screens>
  <form
    onsubmit={event => {
      event.preventDefault();
      onsave?.(value);
    }}
  >
    <IconField {value} onchange={choice => (value = choice)} />
    <input aria-label="Name" />
    <button type="submit">Save</button>
  </form>
</ScyllaDialog>
