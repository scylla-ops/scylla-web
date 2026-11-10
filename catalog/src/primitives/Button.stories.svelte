<script module lang="ts">
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import TrashIcon from '@lucide/svelte/icons/trash-2';
  import { Button, type ButtonSize, type ButtonVariant } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const VARIANTS = [
    'default',
    'secondary',
    'outline',
    'ghost',
    'link',
    'destructive',
    'ghost-destructive',
  ] as const satisfies ButtonVariant[];
  const SIZES = ['xs', 'sm', 'default', 'lg'] as const satisfies ButtonSize[];
  const ICON_SIZES = ['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const satisfies ButtonSize[];

  const { Story } = defineMeta({
    title: 'Primitives/Button',
    component: Button,
    argTypes: {
      variant: { control: 'select', options: VARIANTS },
      size: { control: 'select', options: [...SIZES, ...ICON_SIZES] },
      disabled: { control: 'boolean' },
    },
  });
</script>

<Story name="Playground" args={{ variant: 'default', size: 'default', disabled: false }}>
  {#snippet template(args)}
    <Button {...args}>Button</Button>
  {/snippet}
</Story>

<Story name="Variants and states" asChild>
  <div class="grid gap-6">
    {#each VARIANTS as variant (variant)}
      <div class="flex flex-wrap items-end gap-6">
        <Specimen label={variant}><Button {variant}>Save</Button></Specimen>
        <Specimen label="hover" state="hover"><Button {variant}>Save</Button></Specimen>
        <Specimen label="focus" state="focus"><Button {variant}>Save</Button></Specimen>
        <Specimen label="disabled"><Button {variant} disabled>Save</Button></Specimen>
        <Specimen label="invalid"><Button {variant} aria-invalid="true">Save</Button></Specimen>
      </div>
    {/each}
  </div>
</Story>

<Story name="Sizes" asChild>
  <div class="grid gap-6">
    <div class="flex flex-wrap items-end gap-6">
      {#each SIZES as size (size)}
        <Specimen label={size}><Button {size}>Save</Button></Specimen>
      {/each}
    </div>
    <div class="flex flex-wrap items-end gap-6">
      {#each SIZES as size (size)}
        <Specimen label="{size}, icon first">
          <Button {size}><PlusIcon />New</Button>
        </Specimen>
      {/each}
    </div>
    <div class="flex flex-wrap items-end gap-6">
      {#each ICON_SIZES as size (size)}
        <Specimen label={size}>
          <Button {size} variant="outline" aria-label="Add"><PlusIcon /></Button>
        </Specimen>
      {/each}
    </div>
  </div>
</Story>

<Story name="Composition" asChild>
  <div class="flex flex-wrap items-end gap-6">
    <Specimen label="link (href)"><Button href="#docs" variant="link">Read the guide</Button></Specimen>
    <Specimen label="icon last"><Button>Continue<ArrowRightIcon /></Button></Specimen>
    <Specimen label="destructive with icon">
      <Button variant="destructive"><TrashIcon />Delete</Button>
    </Specimen>
    <Specimen label="ghost-destructive, icon">
      <Button variant="ghost-destructive" size="icon" aria-label="Delete"><TrashIcon /></Button>
    </Specimen>
  </div>
</Story>
