<script lang="ts">
  import BlocksIcon from '@lucide/svelte/icons/blocks';
  import BotIcon from '@lucide/svelte/icons/bot';
  import { entityGlyph } from '@scylla/ui';
  import { currentTheme } from '@scylla/ui/stores';
  import { cn } from '@scylla/ui/utils';
  import {
    avatarColors,
    userInitials,
    type IdentityKind,
    type UserIdentityProfile,
  } from '@shared/presentation/presenters/user-identity.presenter.ts';

  interface Props {
    /** `undefined`: a missing actor, shown as '?' in a dashed circle. */
    profile: UserIdentityProfile | undefined;
    kind?: IdentityKind;
    /** The person who reads the page: a solid circle. */
    self?: boolean;
    /** An agent with an open stream: a dot on the corner. */
    online?: boolean;
    size?: 16 | 24 | 32 | 40 | 48 | 72;
    class?: string;
  }

  let {
    profile,
    kind = 'person',
    self = false,
    online = false,
    size = 32,
    class: className,
  }: Props = $props();

  const SIZES = {
    16: { box: 'size-4 text-[8px]', icon: 'size-2.5', dot: 'size-1.5' },
    24: { box: 'size-6 text-[10px]', icon: 'size-3.5', dot: 'size-2' },
    32: { box: 'size-8 text-xs', icon: 'size-4', dot: 'size-2.5' },
    40: { box: 'size-10 text-sm', icon: 'size-5', dot: 'size-2.5' },
    48: { box: 'size-12 text-base', icon: 'size-6', dot: 'size-3' },
    72: { box: 'size-18 text-2xl', icon: 'size-9', dot: 'size-4' },
  };

  /** A person is round, a machine is a rounded square. */
  const LOOKS = {
    person: 'rounded-full bg-primary/12 text-primary',
    self: 'rounded-full bg-primary text-primary-foreground',
    agent: 'rounded-[25%] bg-info/14 text-info',
    app: 'rounded-[25%] border bg-secondary text-muted-foreground',
    missing: 'rounded-full border border-dashed border-input text-muted-foreground',
  };

  const look = $derived(!profile ? 'missing' : kind === 'person' && self ? 'self' : kind);
  /** A 16 px avatar has room for one letter. */
  const initials = $derived(
    profile ? [...userInitials(profile)].slice(0, size === 16 ? 1 : 2).join('') : '',
  );

  // A broken image (deleted on the server) falls back to the initials or the glyph.
  let failedImage = $state<string | undefined>();
  const image = $derived(
    profile?.avatarUrl && profile.avatarUrl !== failedImage ? profile.avatarUrl : undefined,
  );
  // The chosen color goes through CSS variables, so the class of a caller still wins.
  const colors = $derived(
    profile?.avatarColor ? avatarColors(profile.avatarColor, look === 'self', currentTheme()) : undefined,
  );
  const Glyph = $derived(
    (profile?.avatarGlyph && entityGlyph(profile.avatarGlyph)) ||
      (look === 'app' ? BlocksIcon : BotIcon),
  );
</script>

<span
  aria-hidden="true"
  data-kind={look}
  data-image={image ? '' : undefined}
  class={cn(
    'relative flex shrink-0 items-center justify-center font-semibold',
    SIZES[size].box,
    LOOKS[look],
    colors && 'bg-(--avatar-tile) text-(--avatar-ink)',
    className,
  )}
  style:--avatar-tile={colors?.tile}
  style:--avatar-ink={colors?.ink}
>
  {#if image}
    <img
      src={image}
      alt=""
      draggable="false"
      class="size-full rounded-[inherit] object-cover"
      onerror={() => (failedImage = image)}
    />
  {:else if look === 'agent' || look === 'app'}
    <Glyph class={SIZES[size].icon} />
  {:else if profile}
    {initials}
  {:else}
    ?
  {/if}
  {#if look === 'agent' && online}
    <span
      data-slot="online"
      class={cn(
        'absolute -right-0.5 -bottom-0.5 rounded-full bg-status-passed ring-2 ring-background',
        SIZES[size].dot,
      )}
    ></span>
  {/if}
</span>
