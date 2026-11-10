<script module lang="ts">
  import { ResizableHandle, ResizablePane, ResizablePaneGroup } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({
    title: 'Primitives/Resizable',
    component: ResizablePaneGroup,
    subcomponents: { ResizablePane, ResizableHandle },
  });
</script>

<Story name="Directions" asChild>
  <div class="grid max-w-2xl gap-8">
    <Specimen label="horizontal" class="w-full">
      <div class="h-40 w-full rounded-xl border">
        <ResizablePaneGroup direction="horizontal">
          <ResizablePane defaultSize={30} minSize={20}>
            <div class="p-3 text-sm">Nodes</div>
          </ResizablePane>
          <ResizableHandle />
          <ResizablePane defaultSize={70}>
            <div class="p-3 text-sm">Editor</div>
          </ResizablePane>
        </ResizablePaneGroup>
      </div>
    </Specimen>
    <Specimen label="vertical, collapsible" class="w-full">
      <div class="h-56 w-full rounded-xl border">
        <ResizablePaneGroup direction="vertical">
          <ResizablePane defaultSize={60}>
            <div class="p-3 text-sm">Script</div>
          </ResizablePane>
          <ResizableHandle />
          <ResizablePane defaultSize={40} collapsible collapsedSize={0} minSize={15}>
            <div class="p-3 text-sm">Output</div>
          </ResizablePane>
        </ResizablePaneGroup>
      </div>
    </Specimen>
  </div>
</Story>
