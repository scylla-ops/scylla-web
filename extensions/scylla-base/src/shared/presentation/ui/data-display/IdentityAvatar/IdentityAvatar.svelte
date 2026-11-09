<script lang="ts">
  import BlocksIcon from '@lucide/svelte/icons/blocks';
  import BotIcon from '@lucide/svelte/icons/bot';
  import { cn } from '@scylla/ui/utils';
  import {
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
    size?: 24 | 32 | 48 | 72;
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
    24: { box: 'size-6 text-[10px]', icon: 'size-3.5', dot: 'size-2' },
    32: { box: 'size-8 text-xs', icon: 'size-4', dot: 'size-2.5' },
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
</script>

<span
  aria-hidden="true"
  data-kind={look}
  class={cn(
    'relative flex shrink-0 items-center justify-center font-semibold',
    SIZES[size].box,
    LOOKS[look],
    className,
  )}
>
  {#if look === 'agent'}
    <BotIcon class={SIZES[size].icon} />
    {#if online}
      <span
        data-slot="online"
        class={cn(
          'absolute -right-0.5 -bottom-0.5 rounded-full bg-status-passed ring-2 ring-background',
          SIZES[size].dot,
        )}
      ></span>
    {/if}
  {:else if look === 'app'}
    <BlocksIcon class={SIZES[size].icon} />
  {:else if profile}
    {userInitials(profile)}
  {:else}
    ?
  {/if}
</span>
