<script module lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import TrashIcon from '@lucide/svelte/icons/trash-2';
  import { IconButton } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const VARIANTS = [
    { variant: 'default', icon: CopyIcon, tooltip: 'Copy' },
    { variant: 'destructive', icon: TrashIcon, tooltip: 'Delete' },
  ] as const;

  const { Story } = defineMeta({
    title: 'Controls/IconButton',
    component: IconButton,
    args: { icon: CopyIcon, tooltip: 'Copy' },
    argTypes: {
      variant: { control: 'select', options: ['default', 'destructive'] },
      icon: { control: false },
    },
  });
</script>

<Story name="Playground" args={{ variant: 'default', disabled: false, busy: false }} />

<Story name="Variants and states" asChild>
  <div class="grid gap-6">
    {#each VARIANTS as { variant, icon, tooltip } (variant)}
      <div class="flex flex-wrap items-end gap-8">
        <Specimen label={variant}><IconButton {variant} {icon} {tooltip} /></Specimen>
        <Specimen label="hover" state="hover"><IconButton {variant} {icon} {tooltip} /></Specimen>
        <Specimen label="focus" state="focus"><IconButton {variant} {icon} {tooltip} /></Specimen>
        <Specimen label="disabled"><IconButton {variant} {icon} {tooltip} disabled /></Specimen>
        <Specimen label="busy"><IconButton {variant} {icon} {tooltip} busy /></Specimen>
      </div>
    {/each}
  </div>
</Story>
