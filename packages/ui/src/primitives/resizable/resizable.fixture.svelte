<script lang="ts">
  import { ResizableHandle, ResizablePane, ResizablePaneGroup } from '../index.ts';

  interface Props {
    label?: string;
  }

  let { label }: Props = $props();
</script>

<ResizablePaneGroup direction="horizontal">
  <ResizablePane id="left" order={1}>Left</ResizablePane>
  <ResizableHandle aria-label={label} />
  <ResizablePane id="right" order={2}>Right</ResizablePane>
</ResizablePaneGroup>
