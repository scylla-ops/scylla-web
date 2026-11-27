<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import ScyllaDialog from '../../feedback/ScyllaDialog/ScyllaDialog.svelte';
  import { t } from '../../i18n/index.ts';
  import {
    Button,
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    SheetContent,
  } from '../../primitives/index.ts';
  import { SCYLLA_GLYPH_AVATAR, type GlyphAvatar } from '../../structs/glyph-avatar.struct.ts';
  import { glyphAvatarMessages as m } from './glyph-avatar.messages.ts';
  import GlyphAvatarEditor from './GlyphAvatarEditor.svelte';
  import GlyphScrollArea from './GlyphScrollArea.svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The avatar to edit. Not set: the Scylla head, for a first avatar. */
    value?: GlyphAvatar;
    /** Saves the avatar; the owner closes the dialog when the server has it. */
    onsave: (avatar: GlyphAvatar) => void;
    saving?: boolean;
    /** The recent free colors, the most recent first. */
    recent?: readonly string[];
    /** The avatar of an App: a rounded square. */
    square?: boolean;
    title?: string;
  }

  let {
    open,
    onOpenChange,
    value,
    onsave,
    saving = false,
    recent = [],
    square = false,
    title,
  }: Props = $props();

  /** A phone gets a sheet from the bottom edge, as the other editors of a phone. */
  const phone = new MediaQuery('max-width: 767px');
  let draft = $state<GlyphAvatar | undefined>();
  const start = $derived(value ?? SCYLLA_GLYPH_AVATAR);
</script>

{#snippet body()}
  <!-- The controls scroll under a fixed header and footer; the preview stays in view. -->
  <GlyphScrollArea class="max-h-[62dvh] md:max-h-none">
    <GlyphAvatarEditor value={start} onchange={avatar => (draft = avatar)} {recent} {square} />
  </GlyphScrollArea>
  <DialogFooter>
    <Button type="button" variant="outline" data-dialog-dismiss onclick={() => onOpenChange(false)}>
      {t(m.cancel)}
    </Button>
    <Button type="button" disabled={saving} onclick={() => onsave(draft ?? start)}>
      {t(m.save)}
    </Button>
  </DialogFooter>
{/snippet}

{#if phone.current}
  <Dialog
    {open}
    onOpenChange={next => {
      draft = undefined;
      onOpenChange(next);
    }}
  >
    <SheetContent
      side="bottom"
      data-slot="glyph-avatar-dialog"
      class="rounded-t-2xl p-4 pb-6"
    >
      <DialogHeader>
        <DialogTitle>{title ?? t(m.title)}</DialogTitle>
        <DialogDescription>{t(m.description)}</DialogDescription>
      </DialogHeader>
      {#if open}
        {@render body()}
      {/if}
    </SheetContent>
  </Dialog>
{:else}
  <ScyllaDialog
    {open}
    onOpenChange={next => {
      draft = undefined;
      onOpenChange(next);
    }}
    title={title ?? t(m.title)}
    description={t(m.description)}
    class="sm:max-w-4xl"
    data-slot="glyph-avatar-dialog"
  >
    {@render body()}
  </ScyllaDialog>
{/if}
