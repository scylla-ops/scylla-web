<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import { userInitials, type UserIdentityProfile } from './user-identity.ts';

  interface Props {
    /** `undefined`: a missing user, shown as '?'. */
    user: UserIdentityProfile | undefined;
    size?: 'sm' | 'default' | 'lg';
    class?: string;
  }

  let { user, size = 'default', class: className }: Props = $props();

  const SIZES = { sm: 'size-8 text-xs', default: 'size-9 text-sm', lg: 'size-18 text-2xl' };
</script>

<span
  aria-hidden="true"
  class={cn(
    'flex shrink-0 items-center justify-center rounded-full font-semibold',
    SIZES[size],
    user ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
    className,
  )}
>
  {user ? userInitials(user) : '?'}
</span>
