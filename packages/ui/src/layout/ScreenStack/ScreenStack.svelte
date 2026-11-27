<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import type { Snippet } from 'svelte';
  import { t } from '../../i18n/index.ts';
  import {
    SCREEN_AWAY_CLASS,
    SCREEN_BEHIND_CLASS,
    screenIn,
    screenOut,
  } from '../../motion/screen-slide.ts';
  import { Button } from '../../primitives/index.ts';
  import { cn } from '../../utils/index.ts';
  import { followScreenHeight } from './screen-height.attachments.svelte.ts';
  import { setScreenStack, type ScreenStackState } from './screen-stack.ts';
  import { screenStackMessages as m } from './screen-stack.messages.ts';
  import { createScreenStack } from './screen-stack.state.svelte.ts';

  interface Props {
    /** The state, for an owner that reads it (Escape in a dialog). By default, its own. */
    stack?: ScreenStackState;
    class?: string;
    /** Classes of the main screen: the layout of its parts, e.g. the column of a dialog. */
    mainClass?: string;
    /** Classes of the second screen, e.g. a centered column in a wide box. */
    screenClass?: string;
    /** The main screen. It stays while a second screen shows: a form in it keeps its values. */
    children: Snippet;
  }

  let {
    stack = createScreenStack(),
    class: className,
    mainClass,
    screenClass,
    children,
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  setScreenStack(stack);

  const titleId = $props.id();
  const screen = $derived(stack.screen);

  // Escape goes back first. A popover of the screen is in a portal: its Escape does not come here.
  const escape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    stack.back();
  };

  const focusBack = (button: HTMLElement) => {
    button.focus({ preventScroll: true });
  };
</script>

<!-- The two screens are in one cell: the box has the height of the taller one, thus a second
     screen that is not taller than the main one moves nothing around the box. The screen that
     goes back (`inert` while it slides) is out of the flow: the box takes the height of the main
     one at once, and moves to it. -->
<div
  data-slot="screen-stack"
  class={cn(
    'relative grid grid-cols-[minmax(0,1fr)] items-start overflow-x-clip *:col-start-1 *:row-start-1',
    '[&>[data-screen=second][inert]]:absolute [&>[data-screen=second][inert]]:inset-x-0 [&>[data-screen=second][inert]]:top-0',
    className,
  )}
  {@attach followScreenHeight(() => stack.screen)}
>
  <!-- The whole cell is inert while a second screen shows: it stays in the grid at `opacity-0`,
       and must neither take a click, nor a focus, nor be read. -->
  <div
    data-screen="main"
    inert={!!screen}
    aria-hidden={screen ? 'true' : undefined}
    class={cn(SCREEN_BEHIND_CLASS, screen && SCREEN_AWAY_CLASS, screen && 'pointer-events-none')}
  >
    <div class={mainClass}>
      {@render children()}
    </div>
  </div>
  {#if screen}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <section
      data-screen="second"
      aria-labelledby={titleId}
      class={cn('flex min-w-0 flex-col gap-4 self-stretch', screenClass)}
      onkeydown={escape}
      in:screenIn
      out:screenOut
    >
      <div class="relative flex min-h-8 items-center justify-center px-20">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="absolute top-1/2 left-0 -translate-y-1/2"
          onclick={() => stack.back()}
          {@attach focusBack}
        >
          <ChevronLeftIcon aria-hidden="true" />
          {t(m.back)}
        </Button>
        <div class="flex min-w-0 items-center gap-2">
          {@render screen.leading?.()}
          <h2 id={titleId} class="truncate text-lg leading-none">{screen.title}</h2>
        </div>
      </div>
      {@render screen.content()}
    </section>
  {/if}
</div>
