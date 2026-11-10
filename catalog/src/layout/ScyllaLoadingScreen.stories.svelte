<script module lang="ts">
  import { ScyllaLoadingScreen } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Layout/ScyllaLoadingScreen',
    component: ScyllaLoadingScreen,
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story name="After 300 ms" asChild>
  <div class="h-screen"><ScyllaLoadingScreen /></div>
</Story>
