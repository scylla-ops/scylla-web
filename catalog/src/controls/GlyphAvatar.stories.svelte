<script module lang="ts">
  import {
    GlyphAvatarCredit,
    GlyphAvatarDialog,
    GlyphAvatarEditor,
    IconPicker,
    glyphDataUri,
    type IconChoice,
  } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { SCYLLA_GLYPH_AVATAR, type GlyphAvatar } from '@scylla/ui/structs';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Controls/GlyphAvatar', component: GlyphAvatarEditor });

  const RECENT = ['#E879F9', '#F97316', '#22D3EE', '#4338CA'];

  const GRADIENT: GlyphAvatar = {
    shape: 'variant12',
    glyph: { colors: ['#ffffff'], fill: 'solid', angle: 0 },
    background: { colors: ['#4338ca', '#22d3ee'], fill: 'linear', angle: 135 },
    flip: 'none',
    rotate: 0,
    scale: 100,
  };
</script>

<script lang="ts">
  let avatar = $state<GlyphAvatar>(GRADIENT);
  let open = $state(false);
  let app = $state<IconChoice>({ kind: 'avatar', avatar: SCYLLA_GLYPH_AVATAR });
</script>

<!-- The editor of a dialog: the large preview, Random, Reset and the credit beside the controls. -->
<Story name="Editor" asChild>
  <div class="flex flex-wrap items-start gap-8">
    <Specimen label="with its preview" class="w-full max-w-3xl">
      <GlyphAvatarEditor value={GRADIENT} onchange={next => (avatar = next)} recent={RECENT} />
    </Specimen>
    <Specimen label="the result">
      <img src={glyphDataUri(avatar)} alt="" class="size-24 rounded-full" />
    </Specimen>
  </div>
</Story>

<!-- A person opens it from the card of the profile photo; a phone gets a sheet. -->
<Story name="Dialog" asChild>
  <Specimen label="make an avatar">
    <Button onclick={() => (open = true)}>Make an avatar</Button>
    <GlyphAvatarDialog
      {open}
      onOpenChange={next => (open = next)}
      value={avatar}
      onsave={next => {
        avatar = next;
        open = false;
      }}
      recent={RECENT}
    />
  </Specimen>
</Story>

<!-- The Avatar tab of the icon picker of an App: the picker shows the preview. -->
<Story name="In the icon picker" asChild>
  <Specimen label="an App" class="w-[464px]">
    <IconPicker
      value={app}
      onchange={choice => (app = choice)}
      title="scylla-ci"
      defaultGlyph="bot"
      defaultColor="info"
      recent={RECENT}
      avatar
    />
  </Specimen>
</Story>

<Story name="Credit" asChild>
  <Specimen label="the license of the style">
    <GlyphAvatarCredit />
  </Specimen>
</Story>
