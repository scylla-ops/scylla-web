<script module lang="ts">
  import { CopyableText } from '@scylla/ui';
  import { Badge } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const ID = '7f3c2a91-5e0b-4d8f-a6c2-1b9e8d4f0a37';

  const { Story } = defineMeta({ title: 'Data display/CopyableText', component: CopyableText });
</script>

<Story name="Cases" asChild>
  <div class="flex flex-wrap items-end gap-10">
    <Specimen label="full value"><CopyableText value={ID} /></Specimen>
    <Specimen label="truncate 8"><CopyableText value={ID} truncate={8} /></Specimen>
    <Specimen label="truncate 8, full on hover">
      <CopyableText value={ID} truncate={8} showFullOnHover />
    </Specimen>
    <Specimen label="display text"><CopyableText value={ID} display="build #128" /></Specimen>
    <Specimen label="hover" state="hover"><CopyableText value={ID} truncate={8} /></Specimen>
    <Specimen label="in a badge">
      <Badge variant="secondary">
        <CopyableText value={ID} truncate={8} copyButtonClass="size-4" />
      </Badge>
    </Specimen>
  </div>
</Story>
