<script lang="ts">
  import { prefersReducedMotion } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import { avatarMessages as m } from '../../../messages/avatar.messages.ts';
  import SettingsSection from '../SettingsSection.svelte';
  import { photoFocus } from './photo-focus.state.svelte.ts';
  import UserAvatarEditor from './UserAvatarEditor.svelte';

  interface Props {
    /** The account of the session. */
    user: UserEntity;
  }

  let { user }: Props = $props();

  /** How long the ring shows on the card that a click on the own avatar brought into view. */
  const HIGHLIGHT_MS = 1200;

  let root = $state<HTMLElement | null>(null);
  let highlight = $state(false);
  let glyphOpen = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  // A click on the own avatar elsewhere (`openProfilePhoto`) scrolls to the card, puts the focus
  // in it, and rings it for a moment.
  $effect(() => {
    if (!photoFocus.pending || !root) return;
    photoFocus.pending = false;
    if (photoFocus.glyph) {
      photoFocus.glyph = false;
      glyphOpen = true;
    }
    root.scrollIntoView?.({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    root.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
    highlight = true;
    clearTimeout(timer);
    timer = setTimeout(() => (highlight = false), HIGHLIGHT_MS);
  });
  $effect(() => () => clearTimeout(timer));
</script>

<div
  bind:this={root}
  data-slot="user-avatar-card"
  data-highlight={highlight || undefined}
  class={cn(
    'rounded-xl ring-primary ring-offset-2 ring-offset-background transition-shadow duration-300 motion-reduce:transition-none',
    highlight && 'ring-2',
  )}
>
  <SettingsSection title={t(m.title)} description={t(m.description)}>
    <UserAvatarEditor {user} bind:glyphOpen />
  </SettingsSection>
</div>
