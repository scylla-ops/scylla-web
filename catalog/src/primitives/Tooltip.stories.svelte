<script module lang="ts">
  import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({
    title: 'Primitives/Tooltip',
    component: Tooltip,
    subcomponents: { TooltipTrigger, TooltipContent },
  });
</script>

<Story name="Open" asChild>
  <div class="flex flex-wrap items-start gap-24 pt-12">
    <Specimen label="with an arrow">
      <Tooltip open>
        <TooltipTrigger>
          {#snippet child({ props })}<Button variant="outline" {...props}>Hover me</Button>{/snippet}
        </TooltipTrigger>
        <TooltipContent>Copy the id</TooltipContent>
      </Tooltip>
    </Specimen>
    <Specimen label="no arrow, below">
      <Tooltip open>
        <TooltipTrigger>
          {#snippet child({ props })}<Button variant="outline" {...props}>Hover me</Button>{/snippet}
        </TooltipTrigger>
        <TooltipContent arrow={false} side="bottom">Last run: 2 minutes ago</TooltipContent>
      </Tooltip>
    </Specimen>
  </div>
</Story>

<Story name="On hover" asChild>
  <Tooltip>
    <TooltipTrigger>
      {#snippet child({ props })}<Button variant="outline" {...props}>Hover me</Button>{/snippet}
    </TooltipTrigger>
    <TooltipContent>Copy the id</TooltipContent>
  </Tooltip>
</Story>
