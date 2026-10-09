<script lang="ts">
  import { CopyableText } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { UserEntity } from '../../../domain/entities/user.entity.ts';
  import UserIdentityCard from '../components/UserIdentityCard.svelte';
  import UserStatusBadge from '../components/UserStatusBadge.svelte';
  import { userMessages } from '../user.messages.ts';

  let { user }: { user: UserEntity } = $props();
</script>

<UserIdentityCard {user} isPageTitle>
  {#snippet badges()}
    <UserStatusBadge isActive={user.isActive} />
  {/snippet}
  {#snippet footer()}
    <dl
      class="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground"
    >
      <div>
        <dt class="sr-only">{t(userMessages.createdAt)}</dt>
        <dd>{t(userMessages.createdOn(formatDay(user.createdAt)))}</dd>
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <dt>{t(userMessages.userId)}</dt>
        <dd class="min-w-0">
          <CopyableText value={user.userId} copyLabel={t(userMessages.copyUserId)} />
        </dd>
      </div>
    </dl>
  {/snippet}
</UserIdentityCard>
