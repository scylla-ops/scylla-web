<script module lang="ts">
  import { Button, CodeSnippet } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const COMMAND = 'scylla agent run --token sk_live_51H8x2dLkq9 --server https://scylla.example.com';
  const VARIANTS = ['default', 'dark', 'warning'] as const;

  const { Story } = defineMeta({ title: 'Primitives/CodeSnippet', component: CodeSnippet });
</script>

{#snippet label()}Command{/snippet}

{#snippet reveal()}<Button size="sm" variant="secondary">Reveal</Button>{/snippet}

<Story name="Variants" asChild>
  <div class="grid max-w-xl gap-6">
    {#each VARIANTS as variant (variant)}
      <Specimen label={variant} class="w-full">
        <CodeSnippet value={COMMAND} {variant} {label} class="w-full" />
      </Specimen>
    {/each}
  </div>
</Story>

<Story name="Options" asChild>
  <div class="grid max-w-xl gap-6">
    <Specimen label="multiline" class="w-full">
      <CodeSnippet value={COMMAND} multiline {label} class="w-full" />
    </Specimen>
    <Specimen label="blurred, with an overlay" class="w-full">
      <CodeSnippet value="sk_live_51H8x2dLkq9" blurred overlay={reveal} class="w-full" />
    </Specimen>
    <Specimen label="no label" class="w-full">
      <CodeSnippet value="pnpm ui:catalog" class="w-full" />
    </Specimen>
  </div>
</Story>
