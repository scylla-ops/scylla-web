<script lang="ts">
  import ImageIcon from '@lucide/svelte/icons/image';
  import SmileIcon from '@lucide/svelte/icons/smile';
  import TypeIcon from '@lucide/svelte/icons/type';
  import { createMutation } from '@scylla/core-sdk';
  import {
    ColorSwatches,
    ConfirmOperationAlertDialog,
    SegmentedControl,
    swapIn,
    swapOut,
  } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn, isHexColor } from '@scylla/ui/utils';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import { keepRecentColor, recentColors } from '@base/features/project';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import { avatarMessages as m } from '../../../messages/avatar.messages.ts';
  import { userMutations } from '../../../user.queries.ts';
  import GlyphAvatarPanel from './GlyphAvatarPanel.svelte';
  import ImagePanel from './ImagePanel.svelte';

  type Source = 'initials' | 'avatar' | 'image';

  interface Props {
    /** The account of the session. */
    user: UserEntity;
    /** The editor of the glyph avatar. */
    glyphOpen?: boolean;
  }

  let { user, glyphOpen = $bindable(false) }: Props = $props();

  /** The free color moves with the pointer: the server gets it when it stops for this time. */
  const FREE_COLOR_DELAY_MS = 400;

  const change = createMutation(() => userMutations.updateAvatar());
  const hintId = $props.id();

  /** The photo in use: a glyph avatar and an image are the one image of the account. */
  const inUse = $derived<Source>(user.glyphAvatar ? 'avatar' : user.avatarUrl ? 'image' : 'initials');
  // A segment is a view: it shows the options of its source and changes nothing.
  let chosen = $state<Source | undefined>();
  const view = $derived(chosen ?? inUse);
  // The editor of the glyph avatar opens on its own panel (the command palette opens it too).
  $effect(() => {
    if (glyphOpen) chosen = 'avatar';
  });

  const sources = $derived(
    [
      { value: 'initials', label: t(m.sourceInitials), icon: TypeIcon },
      { value: 'avatar', label: t(m.sourceAvatar), icon: SmileIcon },
      { value: 'image', label: t(m.sourceImage), icon: ImageIcon },
    ].map(source => ({
      ...source,
      dot: source.value === inUse ? { color: 'text-primary' } : undefined,
    })),
  );

  let recent = $state(recentColors());
  /** The color that shows before the server has it. */
  let draft = $state<string | undefined>();
  let confirming = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  /** With no color, the initials show on the main color. */
  const saved = $derived(user.avatarColor || 'primary');
  const selected = $derived(draft ?? saved);
  const asHex = (color: string) => (color === 'primary' ? undefined : color);
  // The preview shows the photo in use: a color that waits for "Use my initials" is not in it.
  const previewColor = $derived(asHex(inUse === 'initials' ? selected : saved));

  const keepColor = (color: string) => {
    if (!isHexColor(color)) return;
    keepRecentColor(color);
    recent = recentColors();
  };

  // The main color is the default color: an empty color keeps no choice on the server.
  const save = (color: string) => {
    timer = undefined;
    if (color.toLowerCase() === saved.toLowerCase()) {
      draft = undefined;
      return;
    }
    change.mutate(
      { color: color === 'primary' ? '' : color },
      {
        onSuccess: () => keepColor(color),
        onSettled: () => {
          if (draft === color && !timer) draft = undefined;
        },
      },
    );
  };

  const chooseColor = (color: string) => {
    draft = color;
    clearTimeout(timer);
    // With a photo in use, the color waits for "Use my initials".
    if (inUse !== 'initials') return;
    if (isHexColor(color)) timer = setTimeout(() => save(color), FREE_COLOR_DELAY_MS);
    else save(color);
  };

  const useInitials = () => {
    const color = draft;
    change.mutate(
      {
        image: null,
        ...(color !== undefined &&
          color.toLowerCase() !== saved.toLowerCase() && {
            color: color === 'primary' ? '' : color,
          }),
      },
      {
        onSuccess: () => {
          if (color) keepColor(color);
        },
        onSettled: () => {
          confirming = false;
          draft = undefined;
        },
      },
    );
  };

  // An image goes only after a confirmation: it cannot be made again. A glyph avatar can.
  const askInitials = () => (inUse === 'image' ? (confirming = true) : useInitials());

  // A free color that still moves when the editor closes is saved all the same.
  $effect(() => () => {
    if (timer && draft) save(draft);
    clearTimeout(timer);
  });

  const panelClass = (source: Source) =>
    cn(
      'col-start-1 row-start-1 flex flex-col items-center gap-3',
      'transition-[opacity,translate] duration-200 motion-reduce:transition-none',
      view === source ? 'opacity-100' : 'pointer-events-none translate-y-1 opacity-0',
    );
</script>

<div data-slot="user-avatar-editor" class="flex flex-col items-center gap-4">
  <!-- The photo in use, the only preview: a new one fades in over the old one. -->
  <span class="grid size-18 shrink-0 place-items-center" data-slot="avatar-preview">
    {#key `${user.avatarUrl ?? ''}|${user.glyphAvatar ? 'glyph' : ''}`}
      <span class="col-start-1 row-start-1 flex" in:swapIn out:swapOut>
        <IdentityAvatar profile={{ ...user, avatarColor: previewColor }} self size={72} />
      </span>
    {/key}
  </span>

  <SegmentedControl
    value={view}
    options={sources}
    onChange={next => (chosen = next as Source)}
    aria-label={t(m.sources)}
    fill
    class="w-full max-w-xs"
  />

  <!-- The panels share one cell: the card keeps the height of the tallest one. -->
  <div class="grid w-full">
    <div class={panelClass('initials')} inert={view !== 'initials'} aria-hidden={view !== 'initials'}>
      <p id={hintId} class="text-xs text-muted-foreground">{t(m.initialsHint)}</p>
      <ColorSwatches
        value={selected}
        onchange={chooseColor}
        {recent}
        labelledby={hintId}
        disabled={change.isPending}
      >
        {#snippet preview(hex)}
          <IdentityAvatar
            profile={{ ...user, avatarUrl: undefined, avatarColor: hex }}
            self
            size={40}
          />
        {/snippet}
      </ColorSwatches>
      <!-- Always there, disabled with the initials in use: the panel keeps its height. -->
      <Button
        variant="outline"
        size="sm"
        disabled={inUse === 'initials' || change.isPending}
        onclick={askInitials}
      >
        {t(m.useInitials)}
      </Button>
    </div>
    <div class={panelClass('avatar')} inert={view !== 'avatar'} aria-hidden={view !== 'avatar'}>
      <GlyphAvatarPanel {user} bind:open={glyphOpen} disabled={change.isPending} />
    </div>
    <div class={panelClass('image')} inert={view !== 'image'} aria-hidden={view !== 'image'}>
      <ImagePanel {user} disabled={change.isPending} />
    </div>
  </div>
</div>

<ConfirmOperationAlertDialog
  open={confirming}
  onOpenChange={next => (confirming = next)}
  variant="destructive"
  title={t(m.useInitialsTitle)}
  description={t(m.useInitialsDescription)}
  continueLabel={t(m.useInitials)}
  isLoading={change.isPending}
  onContinue={useInitials}
/>
