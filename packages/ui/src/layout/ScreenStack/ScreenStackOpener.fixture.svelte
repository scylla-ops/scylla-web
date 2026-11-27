<script lang="ts">
  import { getScreenStack, type Screen } from './screen-stack.ts';

  const stack = getScreenStack();
  const screen: Screen = { title: 'Details', content: details };
  const other: Screen = { title: 'Other', content: details };
</script>

{#snippet details()}
  <button type="button">Inside</button>
{/snippet}

<button type="button" onclick={event => stack?.open(screen, event.currentTarget)}>Open</button>
<button type="button" onclick={() => stack?.close(other)}>Close another</button>
<button type="button" onclick={() => stack?.close(screen)}>Close it</button>
