<script lang="ts">
  import {
    linkedParts,
    type TermsLinks,
  } from '@base/features/login/presentation/presenters/linked-text.presenter.ts';

  interface Props {
    /** A translated sentence with link slots (`linkSlot`). */
    sentence: string;
    links: TermsLinks;
  }

  let { sentence, links }: Props = $props();

  const parts = $derived(linkedParts(sentence));
</script>

<!--
  A legal text opens in a new tab: the form or the step keeps its state. On one line: a new line
  between two parts would add a space.
-->
{#each parts as part, index (index)}{#if part.kind === 'text'}{part.text}{:else}{@const link = links[part.key as keyof TermsLinks]}{#if link}<a href={link.href} target="_blank" rel="noopener noreferrer" class="font-medium whitespace-nowrap text-foreground underline underline-offset-4 hover:text-primary">{link.label}</a>{/if}{/if}{/each}
