<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { Badge, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { IdentityAvatar, userName } from '@shared/presentation/ui';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import { avatarMessages } from '../../../messages/avatar.messages.ts';
  import UserAvatarEditor from '../../components/UserAvatarCard/UserAvatarEditor.svelte';

  interface Props {
    user: UserEntity;
    /** The role of the first system grant. */
    systemRole?: string;
  }

  let { user, systemRole }: Props = $props();

  let editing = $state(false);
</script>

<!-- A click on the avatar changes the photo or the color of the initials, as the Profile card. -->
<header class="flex items-center gap-4 border-b pb-6">
  <Tooltip>
    <TooltipTrigger
      aria-label={t(avatarMessages.changePhoto)}
      class="focus-visible:ring-ring/50 flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-opacity outline-none hover:opacity-80 focus-visible:ring-[3px]"
      onclick={() => (editing = true)}
    >
      <IdentityAvatar profile={user} self size={48} />
    </TooltipTrigger>
    <TooltipContent side="top">{t(avatarMessages.changePhoto)}</TooltipContent>
  </Tooltip>
  <div class="flex min-w-0 flex-col gap-1">
    <h1 class="truncate">{userName(user)}</h1>
    <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {#if user.email}
        <span class="truncate">{user.email}</span>
      {/if}
      {#if user.username}
        <Badge variant="outline">@{user.username}</Badge>
      {/if}
      {#if systemRole}
        <Badge variant="secondary">{systemRole}</Badge>
      {/if}
    </div>
  </div>
</header>

<ScyllaDialog
  open={editing}
  onOpenChange={open => (editing = open)}
  title={t(avatarMessages.title)}
  description={t(avatarMessages.description)}
  class="sm:max-w-lg"
>
  <!-- Each change applies at once, as in the card: the dialog needs no save. -->
  <UserAvatarEditor {user} />
</ScyllaDialog>
