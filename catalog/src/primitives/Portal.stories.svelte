<script module lang="ts">
  import { Badge, Portal } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({ title: 'Primitives/Portal', component: Portal });
</script>

<Story name="At the end of the body" asChild>
  <div class="relative h-24 w-64 overflow-hidden rounded-lg border p-3 text-sm">
    This box clips its content. The badge is in a portal, thus the box does not clip it.
    <Portal>
      <div class="fixed right-4 bottom-4"><Badge>In a portal</Badge></div>
    </Portal>
  </div>
</Story>
