<script module lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({
    title: 'Primitives/Pagination',
    component: Pagination,
    subcomponents: { PaginationContent, PaginationItem, PaginationLink },
  });
</script>

<Story name="Parts" asChild>
  <div class="flex flex-wrap items-end gap-8">
    <Specimen label="pages">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink aria-label="Previous page"><ChevronLeftIcon /></PaginationLink>
          </PaginationItem>
          <PaginationItem><PaginationLink>1</PaginationLink></PaginationItem>
          <PaginationItem><PaginationLink isActive>2</PaginationLink></PaginationItem>
          <PaginationItem><PaginationLink>3</PaginationLink></PaginationItem>
          <PaginationItem>
            <PaginationLink aria-label="Next page"><ChevronRightIcon /></PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </Specimen>
    <Specimen label="link, hover" state="hover">
      <PaginationLink>4</PaginationLink>
    </Specimen>
    <Specimen label="link, size sm">
      <PaginationLink size="sm">5</PaginationLink>
    </Specimen>
  </div>
</Story>
