<script lang="ts">
  import CircleHelpIcon from '@lucide/svelte/icons/circle-help';
  import { Button, Popover, PopoverContent, PopoverTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { loadTourMenu } from '@base/features/onboarding';
  import { layoutMessages } from '../../messages/layout.messages.ts';

  let open = $state(false);
</script>

<Popover bind:open>
  <PopoverTrigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        size="icon"
        class="size-8 shrink-0 rounded-lg data-[state=open]:bg-accent"
        aria-label={t(layoutMessages.help)}
        data-tour="help-menu"
      >
        <CircleHelpIcon class="size-4" aria-hidden="true" />
      </Button>
    {/snippet}
  </PopoverTrigger>
  <PopoverContent
    class="w-[22rem] max-w-[calc(100vw-2rem)] p-0"
    side="bottom"
    align="end"
    sideOffset={4}
    collisionPadding={16}
  >
    {#await loadTourMenu() then { default: TourMenu }}
      <TourMenu onNavigate={() => (open = false)} />
    {/await}
  </PopoverContent>
</Popover>
