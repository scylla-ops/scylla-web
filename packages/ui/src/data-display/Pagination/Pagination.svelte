<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import {
    Pagination as PaginationRoot,
    PaginationContent,
    PaginationItem,
    PaginationLink,
  } from '../../primitives/index.ts';
  import { paginationMessages as navMessages } from '../../primitives/pagination/pagination.messages.ts';
  import type { PaginationInfo } from '../../structs/pagination.struct.ts';
  import { cn } from '../../utils/index.ts';
  import { t } from '../../i18n/lingui.adapter.svelte.ts';
  import { paginationMessages } from './pagination.messages.ts';

  interface Props {
    paginationInfo: PaginationInfo;
    onPageChange: (page: number) => void;
    class?: string;
  }

  let { paginationInfo, onPageChange, class: className }: Props = $props();

  const start = $derived((paginationInfo.page - 1) * paginationInfo.pageSize + 1);
  const end = $derived(Math.min(paginationInfo.page * paginationInfo.pageSize, paginationInfo.totalCount));
</script>

<!-- Under the table, not in it: the range on the left, the pages on the right. -->
<div class={cn('flex items-center justify-between gap-4 px-4 text-xs text-muted-foreground', className)}>
  <p>{t(paginationMessages.range(start, end, paginationInfo.totalCount))}</p>

  <PaginationRoot class="mx-0 w-auto justify-end">
    <PaginationContent>
      <PaginationItem>
        <PaginationLink
          aria-label={t(navMessages.goToPrevious)}
          size="icon-sm"
          onclick={() => paginationInfo.hasPrevious && onPageChange(paginationInfo.page - 1)}
          class={paginationInfo.hasPrevious ? 'cursor-pointer' : 'pointer-events-none opacity-50'}
        >
          <ChevronLeftIcon />
        </PaginationLink>
      </PaginationItem>

      <PaginationItem>
        <span class="sr-only">
          {t(paginationMessages.pageOf(paginationInfo.page, paginationInfo.totalPages))}
        </span>
        <span aria-hidden="true" class="px-1 font-mono font-medium text-foreground">
          {paginationInfo.page} / {paginationInfo.totalPages}
        </span>
      </PaginationItem>

      <PaginationItem>
        <PaginationLink
          aria-label={t(navMessages.goToNext)}
          size="icon-sm"
          onclick={() => paginationInfo.hasNext && onPageChange(paginationInfo.page + 1)}
          class={paginationInfo.hasNext ? 'cursor-pointer' : 'pointer-events-none opacity-50'}
        >
          <ChevronRightIcon />
        </PaginationLink>
      </PaginationItem>
    </PaginationContent>
  </PaginationRoot>
</div>
