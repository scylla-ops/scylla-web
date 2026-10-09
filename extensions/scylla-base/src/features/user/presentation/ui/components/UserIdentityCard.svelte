<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Badge, Card, CardContent, Separator } from '@scylla/ui/shadcn';
  import { UserAvatar, userName } from '@shared/presentation/ui';
  import type { UserEntity } from '../../../domain/entities/user.entity.ts';

  interface Props {
    user: UserEntity;
    /** The name is the title of the page of another user. The own page has a title of its own. */
    isPageTitle?: boolean;
    /** Shown after the `@username` badge. */
    badges?: Snippet;
    /** Shown under a separator. */
    footer?: Snippet;
  }

  let { user, isPageTitle = false, badges, footer }: Props = $props();
</script>

<Card>
  <CardContent class="flex flex-col items-center gap-4 text-center">
    <UserAvatar {user} size="lg" />
    <div class="flex max-w-full min-w-0 flex-col gap-1">
      <svelte:element this={isPageTitle ? 'h1' : 'p'} class="truncate text-xl font-semibold">
        {userName(user)}
      </svelte:element>
      {#if user.email}
        <p class="truncate text-sm text-muted-foreground">{user.email}</p>
      {/if}
    </div>
    <div class="flex flex-wrap justify-center gap-2">
      <Badge variant="outline">@{user.username}</Badge>
      {@render badges?.()}
    </div>
    {#if footer}
      <Separator />
      {@render footer()}
    {/if}
  </CardContent>
</Card>
