<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { Badge, Button, DialogFooter } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { CheckedGitLabConnection } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
  import { connectGitLabMessages as messages } from '@base/features/integrations/presentation/messages/connect-gitlab.messages.ts';
  import { daysUntil } from '@base/features/integrations/presentation/presenters/connection-errors.presenter.ts';
  import { accountKindLabel } from '@base/features/integrations/presentation/presenters/connection.presenter.ts';
  import ProviderTile from '../ProviderTile.svelte';

  interface Props {
    result: CheckedGitLabConnection;
    warnings: string[];
    now: number;
    onDone: () => void;
  }

  let { result, warnings, now, onDone }: Props = $props();

  const connection = $derived(result.connection);
  const expiry = $derived(
    connection.tokenExpiresAt
      ? t(
          messages.expiresOn(
            formatDay(connection.tokenExpiresAt),
            daysUntil(connection.tokenExpiresAt, now),
          ),
        )
      : t(messages.noExpiry),
  );
</script>

<div class="flex flex-col gap-4">
  <p class="text-sm text-muted-foreground" role="status">{t(messages.accepted)}</p>

  <div class="flex flex-col gap-4 rounded-xl border bg-card p-4">
    <div class="flex items-center gap-3">
      <ProviderTile provider="gitlab" />
      <div class="flex min-w-0 grow flex-col">
        <span class="truncate text-sm font-medium">{connection.account}</span>
        <span class="truncate text-xs text-muted-foreground">
          {accountKindLabel(connection.accountKind)}
        </span>
      </div>
      <Badge variant="outline" class="[&>svg]:text-success">
        <CircleCheckIcon aria-hidden="true" />
        {t(messages.valid)}
      </Badge>
    </div>
    <dl class="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2 text-sm">
      <dt class="text-xs text-muted-foreground">{t(messages.scopes)}</dt>
      <dd class="flex flex-wrap items-center gap-1">
        {#each connection.scopes as scope (scope)}
          <Badge variant="secondary" class="font-mono">{scope}</Badge>
        {/each}
      </dd>
      <dt class="text-xs text-muted-foreground">{t(messages.expires)}</dt>
      <dd>{expiry}</dd>
      <dt class="text-xs text-muted-foreground">{t(messages.projects)}</dt>
      <dd>{t(messages.projectCount(connection.repositoryCount))}</dd>
    </dl>
  </div>

  {#if warnings.length > 0}
    <ul class="flex flex-col gap-2">
      {#each warnings as warning (warning)}
        <li class="flex items-center gap-2 text-xs text-muted-foreground">
          <TriangleAlertIcon class="size-4 shrink-0 text-warning" aria-hidden="true" />
          {warning}
        </li>
      {/each}
    </ul>
  {/if}

  <DialogFooter>
    <Button onclick={onDone}>{t(messages.done)}</Button>
  </DialogFooter>
</div>
