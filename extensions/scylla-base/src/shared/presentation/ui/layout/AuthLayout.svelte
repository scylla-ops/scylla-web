<script lang="ts">
  import type { Snippet } from 'svelte';
  import LogoMark from '@scylla/ui/assets/logo_mark.svg';
  import LogoScylla from '@scylla/ui/assets/logo_scylla.svg';
  import LogoScyllaDark from '@scylla/ui/assets/logo_scylla_dark.svg';

  interface Props {
    title: string;
    description?: string;
    children: Snippet;
    /** Under the content, on the axis of the column. */
    below?: Snippet;
    /** Above the title. */
    icon?: Snippet;
  }

  let { title, description, children, below, icon }: Props = $props();
</script>

<!-- The frame of the public pages: the pages of `login` and the page of an invitation. -->
<div class="flex min-h-svh">
  <div
    class="hidden w-2/5 shrink-0 items-center justify-center border-r border-sidebar-border bg-sidebar lg:flex"
  >
    <img src={LogoMark} alt="" class="size-70 opacity-14" />
  </div>

  <div class="flex min-w-0 flex-1 flex-col items-center justify-center p-6">
    <div class="flex w-full max-w-90 flex-col items-center">
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
  </div>
</div>
