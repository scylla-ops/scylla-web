<script lang="ts">
  import type { Snippet } from 'svelte';
  import LogoScylla from '@scylla/ui/assets/logo_scylla.svg';
  import LogoScyllaDark from '@scylla/ui/assets/logo_scylla_dark.svg';
  import { cn } from '@scylla/ui/utils';
  import LogoMark from './LogoMark/LogoMark.svelte';
  import type { LogoMarkState } from './LogoMark/logo-mark.ts';

  interface Props {
    title: string;
    description?: string;
    children: Snippet;
    /** Under the content, on the axis of the column. */
    below?: Snippet;
    /** Above the title. */
    icon?: Snippet;
    /** At the bottom of the column: the legal links (`LegalFooter` of `@platform/legal`). */
    footer?: Snippet;
    /** The dots of the mark in the panel: the sign-in shows its request on them. */
    mark?: LogoMarkState;
    /** The panel closes over the column: the column fades and drifts to the right. */
    leaving?: boolean;
  }

  let {
    title,
    description,
    children,
    below,
    icon,
    footer,
    mark = 'idle',
    leaving = false,
  }: Props = $props();
</script>

<!-- The frame of the public pages: the pages of `login` and the page of an invitation. -->
<div class="flex min-h-svh">
  <div
    class="hidden w-2/5 shrink-0 items-center justify-center border-r border-sidebar-border bg-sidebar lg:flex"
  >
    <LogoMark state={mark} class="size-70" />
  </div>

  <div
    class={cn(
      'flex min-w-0 flex-1 flex-col items-center p-6',
      'transition-[opacity,translate] delay-[100ms,0ms] duration-[350ms,500ms] ease-in',
      leaving && 'translate-x-12 opacity-0',
    )}
  >
    <div class="flex w-full max-w-90 flex-1 flex-col items-center justify-center">
      <!-- A dark variant swapped by CSS: `.dark` is set before the first paint, so no flash. -->
      <!-- The badge is on the right of the logo: the shift puts the mark and the wordmark on the axis. -->
      <img src={LogoScylla} alt="Scylla" class="mb-6 w-40 translate-x-[8.6%] dark:hidden" />
      <img
        src={LogoScyllaDark}
        alt="Scylla"
        class="mb-6 hidden w-40 translate-x-[8.6%] dark:block"
      />

      <div class="mb-6 flex w-full flex-col items-center gap-2 text-center">
        {@render icon?.()}
        <h1>{title}</h1>
        {#if description}
          <p class="text-sm text-muted-foreground">{description}</p>
        {/if}
      </div>

      <div class="w-full">{@render children()}</div>

      {@render below?.()}
    </div>

    {@render footer?.()}
  </div>
</div>
