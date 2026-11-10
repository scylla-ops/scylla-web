<script module lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import { Badge, type BadgeVariant } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const VARIANTS = ['default', 'secondary', 'outline', 'destructive'] as const satisfies BadgeVariant[];

  const { Story } = defineMeta({
    title: 'Primitives/Badge',
    component: Badge,
    argTypes: { variant: { control: 'select', options: VARIANTS } },
  });
</script>

<Story name="Playground" args={{ variant: 'default' }}>
  {#snippet template(args)}
    <Badge {...args}>Badge</Badge>
  {/snippet}
</Story>

<Story name="Variants" asChild>
  <div class="flex flex-wrap items-end gap-6">
    {#each VARIANTS as variant (variant)}
      <Specimen label={variant}><Badge {variant}>Running</Badge></Specimen>
      <Specimen label="{variant}, icon"><Badge {variant}><CheckIcon />Passed</Badge></Specimen>
    {/each}
  </div>
</Story>
