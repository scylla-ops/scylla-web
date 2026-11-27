<script lang="ts">
  import UploadIcon from '@lucide/svelte/icons/upload';
  import type { MessageDescriptor } from '@lingui/core';
  import { createMutation } from '@scylla/core-sdk';
  import { enter, FieldMessage, IMAGE_TYPES, imageFileProblem } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import { avatarMessages as m } from '../../../messages/avatar.messages.ts';
  import { userMutations } from '../../../user.queries.ts';
  import type { PhotoFeedback } from './photo-feedback.ts';
  import ProviderPhotoButtons from './ProviderPhotoButtons.svelte';

  interface Props {
    /** The account of the session. */
    user: UserEntity;
    /** Another change of the avatar runs. */
    disabled?: boolean;
  }

  let { user, disabled = false }: Props = $props();

  const change = createMutation(() => userMutations.updateAvatar());

  let input = $state<HTMLInputElement | null>(null);
  let problem = $state<MessageDescriptor | undefined>();
  let feedback = $state<PhotoFeedback | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    problem = imageFileProblem(file);
    feedback = null;
    if (problem) return;
    change.mutate({ image: new Uint8Array(await file.arrayBuffer()) });
  };

  const failure = $derived(problem ? t(problem) : feedback?.kind === 'failed' ? feedback.text : '');
</script>

<div data-slot="image-panel" class="flex flex-col items-center gap-2 text-center">
  <div class="flex flex-wrap items-center justify-center gap-2">
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || change.isPending}
      onclick={() => input?.click()}
    >
      <UploadIcon class="size-4" aria-hidden="true" />
      {t(m.uploadImage)}
    </Button>
    <ProviderPhotoButtons {user} disabled={disabled || change.isPending} bind:feedback />
  </div>
  <p class="text-xs text-muted-foreground">{t(m.imageRules)}</p>
  <FieldMessage message={failure} role="alert" />
  {#if feedback?.kind === 'done'}
    {#key feedback}
      <p role="status" class="text-xs text-muted-foreground" in:enter>{feedback.text}</p>
    {/key}
  {/if}
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
