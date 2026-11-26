<script lang="ts">
  import SmileIcon from '@lucide/svelte/icons/smile';
  import { createMutation } from '@scylla/core-sdk';
  import { GlyphAvatarDialog, glyphDataUri, seededGlyphAvatar, swapIn, swapOut } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { glyphAvatarKey, type GlyphAvatar } from '@scylla/ui/structs';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import { recentColors } from '@base/features/project';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import { avatarMessages as m } from '../../../messages/avatar.messages.ts';
  import { userMutations } from '../../../user.queries.ts';

  interface Props {
    /** The account of the session. */
    user: UserEntity;
    /** The editor: the account menu and the command palette open it too (`openGlyphAvatar`). */
    open?: boolean;
    disabled?: boolean;
  }

  let { user, open = $bindable(false), disabled = false }: Props = $props();

  const change = createMutation(() => userMutations.updateAvatar());
  const hintId = $props.id();
  // With no glyph avatar yet, the row shows the first avatar that the editor offers.
  const avatar = $derived(user.glyphAvatar ?? seededGlyphAvatar(user.id));

  const save = (glyph: GlyphAvatar) => change.mutate({ glyph }, { onSuccess: () => (open = false) });
</script>

<div data-slot="glyph-avatar-row" class="flex items-center gap-4">
  <!-- A new avatar fades in over the old one. -->
  <span class="grid shrink-0 place-items-center">
    {#key glyphAvatarKey(avatar)}
      <span class="col-start-1 row-start-1 flex" in:swapIn out:swapOut>
        <IdentityAvatar profile={{ ...user, avatarUrl: glyphDataUri(avatar) }} size={48} />
      </span>
    {/key}
  </span>
  <div class="flex min-w-0 flex-col gap-1.5">
    <p id={hintId} class="text-sm font-medium">{t(m.glyphHint)}</p>
    <div class="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-describedby={hintId}
        disabled={disabled || change.isPending}
        onclick={() => (open = true)}
      >
        <SmileIcon class="size-4" aria-hidden="true" />
        {t(user.glyphAvatar ? m.editAvatar : m.makeAvatar)}
      </Button>
    </div>
  </div>
</div>

<GlyphAvatarDialog
  {open}
  onOpenChange={next => (open = next)}
  value={avatar}
  onsave={save}
  saving={change.isPending}
  recent={recentColors()}
/>
