<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import WebhookIcon from '@lucide/svelte/icons/webhook';
  import { GatedButton } from '@scylla/ui';
  import { buttonVariants } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { RepositoryLink } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
  import { integrationsMessages } from '@base/features/integrations/presentation/messages/integrations.messages.ts';
  import { repositoryMessages as messages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import { integrationsUrl } from '@base/features/integrations/presentation/presenters/integrations-url.presenter.ts';
  import {
    eventsLine,
    linkAlert,
    linkSubtitle,
  } from '@base/features/integrations/presentation/presenters/repository-link.presenter.ts';
  import ConnectionStateChip from '../Integrations/ConnectionStateChip.svelte';
  import ProviderTile from '../ProviderTile.svelte';
  import type { RepositoryPage } from './repository-page.state.svelte.ts';

  interface Props {
    page: RepositoryPage;
    link: RepositoryLink;
  }

  let { page, link }: Props = $props();

  const events = $derived(eventsLine(link));
  const alert = $derived(linkAlert(link));
  const EventsIcon = $derived(events.mode === 'webhook' ? WebhookIcon : RefreshCwIcon);
  const repairUrl = $derived.by(() => {
    if (alert?.repair === 'configure') return page.installationUrl;
    if (alert?.repair === 'integrations' && page.canViewIntegrations && page.workspaceSlug) {
      return integrationsUrl(page.workspaceSlug);
    }
    return '';
  });
  const smallOutline = cn(buttonVariants({ variant: 'outline', size: 'xs' }), 'shrink-0');
  // A phone puts the name of a row above its value.
  const ROW = 'flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3';
  const TERM = 'shrink-0 text-xs text-muted-foreground sm:w-30';
</script>

<section
  class="flex flex-col gap-4 rounded-xl border bg-card p-5"
  aria-labelledby="repository-card-title"
>
  <div class="flex items-center gap-3">
    <h2 id="repository-card-title" class="grow text-base">{t(messages.repository)}</h2>
    {#if link.state !== 'active'}
      <ConnectionStateChip state={link.state} />
    {/if}
  </div>

  <div class="flex items-center gap-3">
    <ProviderTile provider={link.provider} />
    <div class="flex min-w-0 grow flex-col gap-0.5">
      <a
        href={link.webUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex w-fit max-w-full items-center gap-1.5 font-mono text-sm font-medium underline-offset-4 hover:underline"
      >
        <span class="truncate">{link.fullName}</span>
        <ExternalLinkIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span class="sr-only">{t(messages.openRepository(link.fullName))}</span>
      </a>
      <p class="text-xs text-muted-foreground">{linkSubtitle(link)}</p>
    </div>
  </div>

  {#if alert}
    <div
      role="alert"
      class="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 px-3 py-2"
    >
      <TriangleAlertIcon class="size-4 shrink-0 text-warning" aria-hidden="true" />
      <p class="grow basis-48 text-sm">{alert.text}</p>
      {#if repairUrl}
        <a
          href={repairUrl}
          target={alert.repair === 'configure' ? '_blank' : undefined}
          rel={alert.repair === 'configure' ? 'noopener noreferrer' : undefined}
          class={smallOutline}
        >
          {t(alert.repair === 'configure' ? integrationsMessages.configureOnGitHub : messages.openIntegrations)}
          {#if alert.repair === 'configure'}
            <ExternalLinkIcon class="size-3" aria-hidden="true" />
          {/if}
        </a>
      {/if}
    </div>
  {/if}

  <dl class="flex flex-col gap-4">
    <div class={ROW}>
      <dt class={TERM}>{t(messages.defaultBranch)}</dt>
      <dd class="flex min-w-0 items-center gap-2">
        <GitBranchIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span class="truncate font-mono text-sm">{link.defaultBranch}</span>
      </dd>
    </div>
    <div class={ROW}>
      <dt class={TERM}>{t(messages.events)}</dt>
      <dd class="flex min-w-0 grow flex-wrap items-center gap-x-3 gap-y-2">
        <span class="flex min-w-0 grow basis-32 items-center gap-2">
          <EventsIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="text-sm" data-delivery={events.mode}>
            {events.reason ? `${events.text} · ${events.reason}` : events.text}
          </span>
        </span>
        {#if events.action}
          <GatedButton
            variant="outline"
            size="xs"
            class="shrink-0"
            allowed={page.canManage}
            deniedReason={t(messages.onlyEditors)}
            disabled={page.testing}
            onclick={page.testDelivery}
          >
            {t(events.action === 'enable_again' ? messages.enableAgain : messages.testWebhook)}
          </GatedButton>
        {/if}
      </dd>
    </div>
  </dl>

  {#if page.testResult}
    {@const result = page.testResult}
    <p role="status" class="flex items-center gap-2 text-xs sm:pl-33">
      {#if result.delivered}
        <CircleCheckIcon class="size-3.5 shrink-0 text-success" aria-hidden="true" />
      {:else}
        <TriangleAlertIcon class="size-3.5 shrink-0 text-warning" aria-hidden="true" />
      {/if}
      <span class={result.delivered ? '' : 'text-muted-foreground'}>{result.text}</span>
    </p>
  {/if}
</section>
