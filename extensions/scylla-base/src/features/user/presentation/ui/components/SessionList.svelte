<script lang="ts">
  import { Separator, Skeleton } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { createNow } from '@scylla/ui/state';
  import type { UserSessionEntity } from '../../../domain/entities/user-session.entity.ts';
  import SessionRow from './SessionRow/SessionRow.svelte';
  import { userMessages } from '../user.messages.ts';

  interface Props {
    sessions: UserSessionEntity[] | undefined;
    isLoading?: boolean;
    isError?: boolean;
    canRevoke: boolean;
    /** True while a revocation runs. */
    isRevoking?: boolean;
    onRevoke: (sessionId: string) => void;
  }

  let {
    sessions,
    isLoading = false,
    isError = false,
    canRevoke,
    isRevoking = false,
    onRevoke,
  }: Props = $props();

  /** Moves "Active now" to "Last active" while the page stays open. */
  const now = createNow(() => !!sessions?.length, 60_000);
</script>

{#if isLoading}
  <Skeleton class="h-24 w-full rounded-lg" />
{:else if isError}
  <p class="text-sm text-destructive">{t(userMessages.sessionsLoadError)}</p>
{:else if !sessions?.length}
  <p class="text-sm text-muted-foreground">{t(userMessages.noSessions)}</p>
{:else}
  <ul class="flex flex-col">
    {#each sessions as session, index (session.sessionId)}
      <li>
        {#if index > 0}
          <Separator />
        {/if}
        <SessionRow
          {session}
          now={now.value}
          {canRevoke}
          disabled={isRevoking}
          {onRevoke}
        />
      </li>
    {/each}
  </ul>
{/if}
