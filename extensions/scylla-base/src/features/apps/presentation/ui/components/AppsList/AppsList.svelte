<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { contextStore, scyllaNavigate } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { ErrorState, FeatureHeader, ListSkeleton } from '@scylla/ui';
  import { Badge, Card } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { appStateOf } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import AppStateDot from '../AppStateDot/AppStateDot.svelte';
  import CreateAppDialog from '../CreateAppDialog/CreateAppDialog.svelte';
  import AddAgentDialog from '../AddAgentDialog/AddAgentDialog.svelte';
  import { appsMessages } from '@base/features/apps/presentation/messages/apps.messages.ts';

  interface Props {
    /** The agents (the apps that run jobs), or the other apps. */
    kind: 'agents' | 'others';
  }

  let { kind }: Props = $props();

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');

  let createOpen = $state(false);

  const apps = createQuery(() => appQueries.list(workspaceId, kind));
  const canCreate = $derived(can(Permission.CREATE_APP, { workspaceId: workspaceId }));

  const STATE_LABEL = {
    online: appsMessages.online,
    offline: appsMessages.offline,
    never: appsMessages.never,
  } as const;
</script>

{#snippet blurb()}
  <p class="max-w-3xl text-sm text-muted-foreground">{t(appsMessages.blurb)}</p>
{/snippet}

<div class="flex h-full min-h-0 w-full flex-col gap-4" data-tour="apps">
  <FeatureHeader
    count={apps.data?.length}
    label={t(appsMessages.app)}
    pluralLabel={t(appsMessages.apps)}
    underLabel={blurb}
    onNew={() => (createOpen = true)}
    newLabel={t(appsMessages.newApp)}
    canNew={canCreate}
  />

  {#if apps.isError}
    <ErrorState message={apps.error?.message} />
  {:else if apps.isPending}
    <!-- Pending, not loading: the query waits for the permissions before its first call. -->
    <ListSkeleton rows={3} rowClass="h-14 w-full rounded-xl" />
  {:else if (apps.data ?? []).length === 0}
    <p class="text-sm text-muted-foreground">{t(appsMessages.empty)}</p>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each apps.data ?? [] as app (app.id)}
        {@const state = appStateOf(app)}
        <li>
          <Card class="py-0">
            <button
              type="button"
              class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50"
              onclick={() => scyllaNavigate.goToWorkspaceRoute(`/${kind === 'agents' ? 'agents' : 'apps'}/${app.id}`)}
            >
              <AppStateDot {state} />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium">{app.name}</span>
                <span class="block truncate text-xs text-muted-foreground">
                  {t(STATE_LABEL[state])}
                  {#if app.host}· {app.host.hostname} · {app.host.os}/{app.host.arch}{/if}
                  {#if app.lastSeenAt && !app.connected}
                    · {t(appsMessages.lastSeen(getRelativeTime(app.lastSeenAt)))}
                  {/if}
                </span>
              </span>
              {#if app.runner}
                <Badge variant="secondary">{t(appsMessages.agentBadge)}</Badge>
              {/if}
            </button>
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if workspaceId && kind === 'agents'}
  <AddAgentDialog open={createOpen} setOpen={open => (createOpen = open)} {workspaceId} />
{:else if workspaceId}
  <CreateAppDialog
    open={createOpen}
    setOpen={open => (createOpen = open)}
    {workspaceId}
    runner={false}
  />
{/if}
