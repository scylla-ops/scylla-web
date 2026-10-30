<script lang="ts">
  import { Badge } from '@scylla/ui/primitives';
  import { UserAvatar, userName } from '@shared/presentation/ui';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';

  interface Props {
    user: UserEntity;
    /** The role of the first system grant. */
    systemRole?: string;
  }

  let { user, systemRole }: Props = $props();
</script>

<header class="flex items-center gap-4 border-b pb-6">
  <UserAvatar {user} size="lg" class="size-14 text-xl" />
  <div class="flex min-w-0 flex-col gap-1">
    <h1 class="truncate text-2xl font-semibold">{userName(user)}</h1>
    <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {#if user.email}
        <span class="truncate">{user.email}</span>
      {/if}
      <Badge variant="outline">@{user.username}</Badge>
      {#if systemRole}
        <Badge variant="secondary">{systemRole}</Badge>
      {/if}
    </div>
  </div>
</header>
