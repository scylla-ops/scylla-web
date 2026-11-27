<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import ImageIcon from '@lucide/svelte/icons/image';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import { fade, scale } from 'svelte/transition';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, motionDuration } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { loginQueries } from '@base/features/login';
  import { ProviderMark } from '@shared/presentation/ui';
  import type { IdentityEntity } from '@base/features/user/domain/entities/identity.entity.ts';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import { avatarMessages as m } from '../../../messages/avatar.messages.ts';
  import { myIdentityQueries, userMutations } from '../../../user.queries.ts';
  import type { PhotoFeedback } from './photo-feedback.ts';

  interface Props {
    /** The account of the session. */
    user: UserEntity;
    /** Another change of the avatar runs. */
    disabled: boolean;
    feedback: PhotoFeedback | null;
  }

  let { user, disabled, feedback = $bindable() }: Props = $props();

  const methods = createQuery(() => myIdentityQueries.signInMethods());
  const providers = createQuery(() => loginQueries.signInMethods());
  const importPhoto = createMutation(() => userMutations.importAvatar());

  /** One button per identity whose provider gave a photo. */
  const withPhoto = $derived((methods.data?.identities ?? []).filter(identity => identity.hasPicture));
  const keyOf = (identity: IdentityEntity) => `${identity.provider}/${identity.subject}`;
  const providerOf = (slug: string) =>
    providers.data?.providers.find(provider => provider.slug === slug);
  const nameOf = (slug: string) => providerOf(slug)?.displayName ?? slug;
  const hasMark = (slug: string) => ['github', 'gitlab'].includes(providerOf(slug)?.kind ?? '');

  /** The identity of the open confirmation. Its name stays while the dialog closes. */
  let confirming = $state<IdentityEntity | null>(null);
  let confirmName = $state('');
  /** The button that just gave the photo shows a check for a moment. */
  let done = $state<string | null>(null);
  let doneTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => () => clearTimeout(doneTimer));

  const pending = $derived(
    importPhoto.isPending && importPhoto.variables
      ? `${importPhoto.variables.provider}/${importPhoto.variables.subject}`
      : null,
  );
  const stateOf = (identity: IdentityEntity) =>
    pending === keyOf(identity) ? 'loading' : done === keyOf(identity) ? 'done' : 'idle';

  const runImport = (identity: IdentityEntity) => {
    const name = nameOf(identity.provider);
    feedback = null;
    importPhoto.mutate(
      { provider: identity.provider, subject: identity.subject },
      {
        onSuccess: () => {
          confirming = null;
          done = keyOf(identity);
          feedback = { kind: 'done', text: t(m.providerPhotoUsed(name)) };
          clearTimeout(doneTimer);
          doneTimer = setTimeout(() => (done = null), 1600);
        },
        onError: () => {
          confirming = null;
          feedback = { kind: 'failed', text: t(m.providerPhotoFailed(name)) };
        },
      },
    );
  };

  // A photo that the user has goes only after a confirmation.
  const usePhoto = (identity: IdentityEntity) => {
    if (!user.avatarUrl) return runImport(identity);
    confirmName = nameOf(identity.provider);
    confirming = identity;
  };
</script>

{#each withPhoto as identity (keyOf(identity))}
  {@const phase = stateOf(identity)}
  <span
    class="inline-flex"
    in:fade={{ duration: motionDuration(200) }}
    out:fade={{ duration: motionDuration(120) }}
  >
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || importPhoto.isPending}
      aria-busy={phase === 'loading'}
      onclick={() => usePhoto(identity)}
    >
      <!-- The icons of the states cross-fade in one box, so the label never moves. -->
      <span class="grid size-4 shrink-0 place-items-center" aria-hidden="true">
        {#key phase}
          <span
            class="col-start-1 row-start-1 flex items-center justify-center"
            data-phase={phase}
            in:scale={{ start: 0.6, duration: motionDuration(180) }}
            out:fade={{ duration: motionDuration(120) }}
          >
            {#if phase === 'loading'}
              <LoaderCircleIcon class="size-4 animate-spin" />
            {:else if phase === 'done'}
              <CheckIcon class="size-4 text-status-passed" />
            {:else if hasMark(identity.provider)}
              <ProviderMark kind={providerOf(identity.provider)?.kind ?? ''} />
            {:else}
              <ImageIcon class="size-4" />
            {/if}
          </span>
        {/key}
      </span>
      {t(m.useProviderPhoto(nameOf(identity.provider)))}
    </Button>
  </span>
{/each}

<ConfirmOperationAlertDialog
  open={!!confirming}
  onOpenChange={next => {
    if (!next) confirming = null;
  }}
  variant="default"
  title={t(m.replaceTitle)}
  description={t(m.replaceDescription(confirmName))}
  continueLabel={t(m.replace)}
  isLoading={importPhoto.isPending}
  onContinue={() => {
    if (confirming) runImport(confirming);
  }}
/>
