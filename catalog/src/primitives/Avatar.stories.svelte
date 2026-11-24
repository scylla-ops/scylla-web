<script module lang="ts">
  import icon from '@scylla/ui/assets/icon_scylla.png';
  import { Avatar, AvatarFallback, AvatarImage } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({
    title: 'Primitives/Avatar',
    component: Avatar,
    subcomponents: { AvatarImage, AvatarFallback },
  });
</script>

<Story name="Image and fallback" asChild>
  <div class="flex flex-wrap items-end gap-8">
    <Specimen label="image">
      <Avatar>
        <AvatarImage src={icon} alt="Scylla" />
        <AvatarFallback>SC</AvatarFallback>
      </Avatar>
    </Specimen>
    <Specimen label="fallback, no image">
      <Avatar><AvatarFallback>AL</AvatarFallback></Avatar>
    </Specimen>
    <Specimen label="fallback, broken image">
      <Avatar>
        <AvatarImage src="/missing.png" alt="Ada Lovelace" />
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
    </Specimen>
    <Specimen label="large">
      <Avatar class="size-12"><AvatarFallback>GH</AvatarFallback></Avatar>
    </Specimen>
  </div>
</Story>
