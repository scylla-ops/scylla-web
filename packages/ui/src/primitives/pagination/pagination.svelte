<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/index.ts';
  import { t } from '../../i18n/i18n-svelte.svelte.ts';
  import { paginationMessages } from './pagination.messages.ts';

  interface Props {
    children: Snippet;
    class?: string;
  }

  let { children, class: className }: Props = $props();
</script>

<!-- `<nav>` already carries the role; shadcn's React original states it anyway. -->
<nav
  aria-label={t(paginationMessages.pagination)}
  data-slot="pagination"
  class={cn('mx-auto flex w-full justify-center', className)}
>
  {@render children()}
</nav>
