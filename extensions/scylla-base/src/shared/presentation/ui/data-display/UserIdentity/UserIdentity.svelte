<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import UserAvatar from '../UserAvatar.svelte';
  import {
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
  <UserAvatar {user} {size} />
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
