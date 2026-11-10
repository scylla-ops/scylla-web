<script module lang="ts">
  import { Button, HoverCard, HoverCardContent, HoverCardTrigger } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Primitives/HoverCard',
    component: HoverCard,
    subcomponents: { HoverCardTrigger, HoverCardContent },
  });
</script>

{#snippet card()}
  <div class="grid gap-2 text-sm">
    <p class="font-medium">3 holders</p>
    <p class="text-muted-foreground">Ada Lovelace, Grace Hopper, Alan Turing</p>
    <a href="#members" class="text-primary underline-offset-4 hover:underline">See all members</a>
  </div>
{/snippet}

<Story name="Open" asChild>
  <div class="h-48">
    <HoverCard open>
      <HoverCardTrigger>
        {#snippet child({ props })}<Button variant="link" {...props}>3 holders</Button>{/snippet}
      </HoverCardTrigger>
      <HoverCardContent align="start">{@render card()}</HoverCardContent>
    </HoverCard>
  </div>
</Story>

<Story name="On hover" asChild>
  <HoverCard openDelay={200}>
    <HoverCardTrigger>
      {#snippet child({ props })}<Button variant="link" {...props}>3 holders</Button>{/snippet}
    </HoverCardTrigger>
    <HoverCardContent align="start">{@render card()}</HoverCardContent>
  </HoverCard>
</Story>
