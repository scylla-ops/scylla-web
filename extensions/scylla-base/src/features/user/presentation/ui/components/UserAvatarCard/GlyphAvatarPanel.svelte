<script lang="ts">
  import SmileIcon from '@lucide/svelte/icons/smile';
  import { createMutation } from '@scylla/core-sdk';
  import { GlyphAvatarDialog, seededGlyphAvatar } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { GlyphAvatar } from '@scylla/ui/structs';
  import { recentColors } from '@base/features/project';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import { avatarMessages as m } from '../../../messages/avatar.messages.ts';
  import { userMutations } from '../../../user.queries.ts';

  interface Props {
    /** The account of the session. */
    user: UserEntity;
    /** The editor: the command palette opens it too (`openGlyphAvatar`). */
    open?: boolean;
    disabled?: boolean;
  }

  let { user, open = $bindable(false), disabled = false }: Props = $props();

  const change = createMutation(() => userMutations.updateAvatar());
  const hintId = $props.id();
  // With no glyph avatar yet, the editor starts on the first avatar that it offers.
  const avatar = $derived(user.glyphAvatar ?? seededGlyphAvatar(user.id));

  const save = (glyph: GlyphAvatar) => change.mutate({ glyph }, { onSuccess: () => (open = false) });
</script>

<div data-slot="glyph-avatar-panel" class="flex flex-col items-center gap-2 text-center">
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
  <p id={hintId} class="text-xs text-muted-foreground">{t(m.glyphHint)}</p>
</div>

<GlyphAvatarDialog
  {open}
  onOpenChange={next => (open = next)}
  value={avatar}
  onsave={save}
  saving={change.isPending}
  recent={recentColors()}
/>
