<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import {
    userInitials,
    userName,
    userSecondaryLine,
    type MissingUser,
    type UserIdentityProfile,
  } from '../user-identity.ts';

  interface Props {
    /** `undefined`: a missing user, named after `missing`. */
    user: UserIdentityProfile | undefined;
    missing?: MissingUser;
    size?: 'sm' | 'default';
    class?: string;
  }

  let { user, missing = 'deleted', size = 'default', class: className }: Props = $props();

  const name = $derived(userName(user, missing));
  const secondary = $derived(user ? userSecondaryLine(user) : undefined);
</script>

<span class={cn('flex min-w-0 items-center gap-3', className)}>
  <span
    aria-hidden="true"
    class={cn(
      'flex shrink-0 items-center justify-center rounded-full font-semibold',
      size === 'sm' ? 'size-8 text-xs' : 'size-9 text-sm',
      user ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
    )}
  >
    {user ? userInitials(user) : '?'}
  </span>
  <span class="flex min-w-0 flex-col gap-0.5 text-left">
    <span
      class={cn(
        'truncate text-sm leading-tight',
        user ? 'font-semibold' : 'italic text-muted-foreground',
      )}
      title={name}
    >
      {name}
    </span>
    {#if secondary}
      <span class="truncate text-xs leading-tight text-muted-foreground" title={secondary}>
        {secondary}
      </span>
    {/if}
  </span>
</span>
