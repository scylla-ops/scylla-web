<script lang="ts">
  import UploadIcon from '@lucide/svelte/icons/upload';
  import type { MessageDescriptor } from '@lingui/core';
  import { fade } from 'svelte/transition';
  import { createMutation } from '@scylla/core-sdk';
  import { ColorSwatches, IMAGE_TYPES, imageFileProblem, motionDuration } from '@scylla/ui';
  import { Button, Separator } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn, isHexColor } from '@scylla/ui/utils';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import { keepRecentColor, recentColors } from '@base/features/project';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import { avatarMessages as m } from '../../../messages/avatar.messages.ts';
  import { userMutations } from '../../../user.queries.ts';
  import GlyphAvatarRow from './GlyphAvatarRow.svelte';
  import type { PhotoFeedback } from './photo-feedback.ts';
  import ProviderPhotoButtons from './ProviderPhotoButtons.svelte';

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

  let input = $state<HTMLInputElement | null>(null);
  let problem = $state<MessageDescriptor | undefined>();
  let feedback = $state<PhotoFeedback | null>(null);
  let recent = $state(recentColors());
  /** The color that shows before the server has it. */
  let draft = $state<string | undefined>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  /** With no color, the initials show on the main color. */
  const saved = $derived(user.avatarColor || 'primary');
  const selected = $derived(draft ?? saved);
  const shown = $derived(selected === 'primary' ? undefined : selected);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    problem = imageFileProblem(file);
    feedback = null;
    if (problem) return;
    change.mutate({ image: new Uint8Array(await file.arrayBuffer()) });
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
        onSuccess: () => {
          if (!isHexColor(color)) return;
          keepRecentColor(color);
          recent = recentColors();
        },
        onSettled: () => {
          if (draft === color && !timer) draft = undefined;
        },
      },
    );
  };

  const chooseColor = (color: string) => {
    draft = color;
    clearTimeout(timer);
    if (isHexColor(color)) timer = setTimeout(() => save(color), FREE_COLOR_DELAY_MS);
    else save(color);
  };

  // A free color that still moves when the editor closes is saved all the same.
  $effect(() => () => {
    if (timer && draft) save(draft);
    clearTimeout(timer);
  });
</script>

<div data-slot="user-avatar-editor" class="flex flex-col gap-4">
  <div class="flex items-center gap-4">
    <IdentityAvatar profile={{ ...user, avatarColor: shown }} self size={40} />
    <div class="flex min-w-0 flex-col gap-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={change.isPending}
          onclick={() => input?.click()}
        >
          <UploadIcon class="size-4" aria-hidden="true" />
          {t(m.uploadImage)}
        </Button>
        <Button
          variant="ghost-destructive"
          size="sm"
          disabled={!user.avatarUrl || change.isPending}
          onclick={() => {
            feedback = null;
            change.mutate({ image: null });
          }}
        >
          {t(m.removeImage)}
        </Button>
        <ProviderPhotoButtons {user} disabled={change.isPending} bind:feedback />
      </div>
      <div class="grid">
        {#if problem}
          <p role="alert" class="col-start-1 row-start-1 text-xs text-destructive">{t(problem)}</p>
        {:else if feedback}
          {#key feedback}
            <p
              role={feedback.kind === 'failed' ? 'alert' : 'status'}
              class={cn(
                'col-start-1 row-start-1 text-xs',
                feedback.kind === 'failed' ? 'text-destructive' : 'text-muted-foreground',
              )}
              in:fade={{ duration: motionDuration(200) }}
              out:fade={{ duration: motionDuration(120) }}
            >
              {feedback.text}
            </p>
          {/key}
        {:else}
          <p
            class="col-start-1 row-start-1 text-xs text-muted-foreground"
            in:fade={{ duration: motionDuration(200) }}
          >
            {t(m.imageRules)}
          </p>
        {/if}
      </div>
    </div>
    <input
      bind:this={input}
      type="file"
      accept={IMAGE_TYPES.join(',')}
      class="hidden"
      onchange={event => {
        void upload(event.currentTarget.files?.[0]);
        event.currentTarget.value = '';
      }}
    />
  </div>

  <Separator />

  <GlyphAvatarRow {user} bind:open={glyphOpen} disabled={change.isPending} />

  <Separator />

  <div class="flex items-center gap-4">
    <IdentityAvatar profile={{ ...user, avatarUrl: undefined, avatarColor: shown }} self size={48} />
    <div class="flex min-w-0 flex-col gap-1.5">
      <p id={hintId} class="text-sm font-medium">{t(m.initialsHint)}</p>
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
    </div>
  </div>
</div>
