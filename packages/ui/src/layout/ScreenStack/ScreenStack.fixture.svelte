<script lang="ts">
  import ScreenStack from './ScreenStack.svelte';
  import ScreenStackOpener from './ScreenStackOpener.fixture.svelte';
</script>

<ScreenStack>
  <input aria-label="Name" />
  <ScreenStackOpener />
</ScreenStack>
