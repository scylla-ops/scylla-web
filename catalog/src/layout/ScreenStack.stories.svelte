<script module lang="ts">
  import { ScreenStack, getScreenStack, type Screen } from '@scylla/ui';
  import { Button, Input } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Layout/ScreenStack', component: ScreenStack });
</script>

{#snippet details()}
  <p class="text-sm text-muted-foreground">
    The second screen. Back, or Escape, gives the main screen again, with its values.
  </p>
{/snippet}

{#snippet main()}
  {@const stack = getScreenStack()}
  {@const screen: Screen = { title: 'Details', content: details }}
  <div class="flex flex-col gap-3">
    <Input aria-label="Name" placeholder="A value that stays" />
    <Button
      variant="outline"
      class="self-center"
      onclick={event => stack?.open(screen, event.currentTarget)}
    >
      Open the details
    </Button>
  </div>
{/snippet}

<Story name="Two screens" asChild>
  <Specimen label="main screen, then a second screen" class="w-[464px]">
    <ScreenStack class="w-full rounded-xl border bg-card p-5">
      {@render main()}
    </ScreenStack>
  </Specimen>
</Story>
