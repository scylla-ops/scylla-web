<script lang="ts">
  import PasswordInput from './PasswordInput.svelte';

  let { onSubmit }: { onSubmit: () => void } = $props();
</script>

<form
  onsubmit={event => {
    event.preventDefault();
    onSubmit();
  }}
>
  <PasswordInput id="pw" value="secret" />
  <button type="submit">Send</button>
</form>
