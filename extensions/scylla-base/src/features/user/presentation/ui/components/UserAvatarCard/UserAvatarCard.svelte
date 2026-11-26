<script lang="ts">
  import UploadIcon from '@lucide/svelte/icons/upload';
  import type { MessageDescriptor } from '@lingui/core';
  import { fade } from 'svelte/transition';
  import { createMutation } from '@scylla/core-sdk';
  import { IMAGE_TYPES, imageFileProblem, motionDuration, SWATCH_COLORS } from '@scylla/ui';
  import { Button, Separator } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import { avatarMessages as m } from '../../../messages/avatar.messages.ts';
  import { userMutations } from '../../../user.queries.ts';
  import SettingsSection from '../SettingsSection.svelte';
  import ProviderPhotoButtons from './ProviderPhotoButtons.svelte';
  import type { PhotoFeedback } from './photo-feedback.ts';

  interface Props {
    /** The account of the session. */
    user: UserEntity;
  }

  let { user }: Props = $props();

  const change = createMutation(() => userMutations.updateAvatar());
  const hintId = $props.id();

  let input = $state<HTMLInputElement | null>(null);
  let problem = $state<MessageDescriptor | undefined>();
  let feedback = $state<PhotoFeedback | null>(null);

  /** With no color, the initials show on the main color. */
  const selected = $derived(user.avatarColor || 'primary');

  const upload = async (file: File | undefined) => {
    if (!file) return;
    problem = imageFileProblem(file);
    feedback = null;
    if (problem) return;
    change.mutate({ image: new Uint8Array(await file.arrayBuffer()) });
  };

  // The main color is the default color: an empty color keeps no choice on the server.
  const chooseColor = (color: string) => {
    if (color !== selected) change.mutate({ color: color === 'primary' ? '' : color });
  };

  const swatchName = (color: string, index: number) =>
    color === 'primary'
      ? t(m.mainColor)
      : color === 'muted-foreground'
        ? t(m.grey)
        : t(m.chartColor(index + 1));
</script>

<SettingsSection title={t(m.title)} description={t(m.description)}>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-4">
      <!-- A new photo cross-fades with the old one. -->
      <span class="grid size-10 shrink-0 place-items-center">
        {#key user.avatarUrl}
          <span
            class="col-start-1 row-start-1 flex"
            in:fade={{ duration: motionDuration(240) }}
            out:fade={{ duration: motionDuration(160) }}
          >
            <IdentityAvatar profile={user} self size={40} />
          </span>
        {/key}
      </span>
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

    <div class="flex items-center gap-4">
      <IdentityAvatar profile={{ ...user, avatarUrl: undefined }} self size={48} />
      <div class="flex min-w-0 flex-col gap-1.5">
        <p id={hintId} class="text-sm font-medium">{t(m.initialsHint)}</p>
        <div role="group" aria-labelledby={hintId} class="flex flex-wrap items-center gap-2">
          {#each SWATCH_COLORS as color, index (color)}
            <button
              type="button"
              aria-pressed={color === selected}
              aria-label={swatchName(color, index)}
              title={swatchName(color, index)}
              disabled={change.isPending}
              class={cn(
                'flex size-7 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                color === selected && 'ring-2 ring-foreground',
              )}
              onclick={() => chooseColor(color)}
            >
              <span class="size-5 rounded-full" style:background="var(--{color})"></span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
</SettingsSection>
