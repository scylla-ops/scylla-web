<script module lang="ts">
  import { Pagination, PaginationSlot } from '@scylla/ui';
  import type { PaginationInfo } from '@scylla/ui/structs';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const PAGE_SIZE = 10;
  const TOTAL = 47;

  const infoOf = (page: number): PaginationInfo => {
    const totalPages = Math.ceil(TOTAL / PAGE_SIZE);
    return {
      totalCount: TOTAL,
      page,
      pageSize: PAGE_SIZE,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  };

  const ONE_PAGE: PaginationInfo = {
    totalCount: 4,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  };

  const { Story } = defineMeta({
    title: 'Data display/Pagination',
    component: Pagination,
    subcomponents: { PaginationSlot },
  });
</script>

<script lang="ts">
  let page = $state(2);
</script>

<Story name="Pagination" asChild>
  <div class="grid max-w-3xl gap-8">
    <Specimen label="middle page" class="w-full">
      <Pagination paginationInfo={infoOf(page)} onPageChange={next => (page = next)} class="w-full" />
    </Specimen>
    <Specimen label="first page" class="w-full">
      <Pagination paginationInfo={infoOf(1)} onPageChange={() => {}} class="w-full" />
    </Specimen>
    <Specimen label="last page" class="w-full">
      <Pagination paginationInfo={infoOf(5)} onPageChange={() => {}} class="w-full" />
    </Specimen>
  </div>
</Story>

<Story name="PaginationSlot" asChild>
  <div class="grid max-w-3xl gap-8">
    <Specimen label="several pages" class="w-full">
      <div class="w-full"><PaginationSlot paginationInfo={infoOf(page)} onPageChange={next => (page = next)} /></div>
    </Specimen>
    <Specimen label="one page: hidden, keeps its height" class="w-full">
      <div class="w-full rounded-md border border-dashed"><PaginationSlot paginationInfo={ONE_PAGE} onPageChange={() => {}} /></div>
    </Specimen>
    <Specimen label="no info yet: hidden, keeps its height" class="w-full">
      <div class="w-full rounded-md border border-dashed"><PaginationSlot paginationInfo={undefined} onPageChange={() => {}} /></div>
    </Specimen>
  </div>
</Story>
