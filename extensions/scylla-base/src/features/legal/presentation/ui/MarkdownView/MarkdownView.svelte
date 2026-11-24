<script lang="ts">
  import {
    Table,
    TableBody,
    TableCell,
    TableFrame,
    TableHead,
    TableHeader,
    TableRow,
  } from '@scylla/ui/primitives';
  import type {
    Block,
    CellAlign,
    Inline,
  } from '@base/features/legal/presentation/presenters/markdown.presenter.ts';

  interface Props {
    blocks: Block[];
  }

  let { blocks }: Props = $props();

  const ALIGN: Record<Exclude<CellAlign, null>, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  const alignClass = (align: CellAlign | undefined) => (align ? ALIGN[align] : undefined);

  const isExternal = (href: string) => /^https?:/i.test(href);
</script>

<!-- Each text renders as text: the presenter gives data, never HTML. -->
{#snippet inline(nodes: Inline[])}
  {#each nodes as node, index (index)}
    {#if node.type === 'text'}{node.text}{:else if node.type === 'break'}<br />{:else if node.type === 'code'}<code
        class="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{node.text}</code
      >{:else if node.type === 'strong'}<strong class="font-semibold"
        >{@render inline(node.children)}</strong
      >{:else if node.type === 'em'}<em>{@render inline(node.children)}</em>{:else}<a
        href={node.href}
        target={isExternal(node.href) ? '_blank' : undefined}
        rel={isExternal(node.href) ? 'noopener noreferrer' : undefined}
        class="text-primary underline underline-offset-4 hover:text-primary/80"
        >{@render inline(node.children)}</a
      >{/if}
  {/each}
{/snippet}

<div class="flex flex-col gap-4 text-sm leading-6 text-foreground">
  {#each blocks as block, index (index)}
    {#if block.type === 'heading'}
      {#if block.level === 2}
        <h2 id={block.id} data-section class="mt-6 scroll-mt-6 text-xl">{@render inline(block.children)}</h2>
      {:else if block.level === 3}
        <h3 id={block.id} class="mt-2 scroll-mt-6 text-base">{@render inline(block.children)}</h3>
      {:else}
        <h4 id={block.id} class="scroll-mt-6 text-sm">{@render inline(block.children)}</h4>
      {/if}
    {:else if block.type === 'paragraph'}
      <p>{@render inline(block.children)}</p>
    {:else if block.type === 'list'}
      {#if block.ordered}
        <ol start={block.start} class="flex list-decimal flex-col gap-1 pl-6">
          {#each block.items as item, itemIndex (itemIndex)}<li>{@render inline(item)}</li>{/each}
        </ol>
      {:else}
        <ul class="flex list-disc flex-col gap-1 pl-6">
          {#each block.items as item, itemIndex (itemIndex)}<li>{@render inline(item)}</li>{/each}
        </ul>
      {/if}
    {:else if block.type === 'quote'}
      <blockquote class="flex flex-col gap-2 border-l-2 border-border pl-4 text-muted-foreground">
        {#each block.paragraphs as paragraph, paragraphIndex (paragraphIndex)}
          <p>{@render inline(paragraph)}</p>
        {/each}
      </blockquote>
    {:else if block.type === 'code'}
      <pre
        class="relative overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">{block.text}</pre>
    {:else if block.type === 'rule'}
      <hr class="border-border" />
    {:else}
      <TableFrame class="print:overflow-visible print:border-0 print:p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {#each block.head as cell, column (column)}
                <TableHead class={['whitespace-normal [overflow-wrap:anywhere]', alignClass(block.align[column])]}>{@render inline(cell)}</TableHead>
              {/each}
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each block.rows as row, rowIndex (rowIndex)}
              <TableRow>
                {#each row as cell, column (column)}
                  <TableCell class={['whitespace-normal [overflow-wrap:anywhere]', alignClass(block.align[column])]}>
                    {@render inline(cell)}
                  </TableCell>
                {/each}
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </TableFrame>
    {/if}
  {/each}
</div>
