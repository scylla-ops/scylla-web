<script lang="ts">
  import { HoverCard, HoverCardContent, HoverCardTrigger } from '../index.ts';
</script>

<HoverCard openDelay={0}>
  <HoverCardTrigger>
    {#snippet child({ props })}
      <button type="button" {...props}>3 holders</button>
    {/snippet}
  </HoverCardTrigger>
  <HoverCardContent>
    <a href="/acme/access/members">See all members</a>
  </HoverCardContent>
</HoverCard>
