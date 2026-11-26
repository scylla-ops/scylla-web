<script lang="ts">
  import IconField from './IconField.svelte';
  import type { IconChoice } from '../IconPicker/icon-picker.ts';

  interface Props {
    initial?: IconChoice;
    disabled?: boolean;
    onchange?: (choice: IconChoice) => void;
    onsubmit?: () => void;
  }

  let { initial = { kind: 'default' }, disabled = false, onchange, onsubmit }: Props = $props();

  // svelte-ignore state_referenced_locally
  let value = $state<IconChoice>(initial);
</script>

<form
  onsubmit={event => {
    event.preventDefault();
    onsubmit?.();
  }}
>
  <IconField
    {value}
    {disabled}
    defaultGlyph="bot"
    defaultColor="info"
    onchange={choice => {
      value = choice;
      onchange?.(choice);
    }}
  />
</form>
