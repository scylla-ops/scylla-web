<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { cn } from '../utils/index.ts';
  import { t } from '../i18n/i18n-svelte.svelte.ts';
  import PaginationLink from './pagination-link.svelte';
  import { paginationMessages } from './pagination.messages.ts';

  interface Props {
    class?: string;
    onclick?: (event: MouseEvent) => void;
  }

  let { class: className, onclick }: Props = $props();
</script>

<PaginationLink
  aria-label={t(paginationMessages.goToNext)}
  size="default"
  class={cn('gap-1 px-2.5 sm:pr-2.5', className)}
  {onclick}
>
  <span class="hidden sm:block">{t(paginationMessages.next)}</span>
  <ChevronRightIcon />
</PaginationLink>
