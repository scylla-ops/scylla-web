<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import CircleDashedIcon from '@lucide/svelte/icons/circle-dashed';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { CopyableText, GatedButton } from '@scylla/ui';
  import { Badge, buttonVariants } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { VcsAppEntity } from '@base/features/integrations/domain/entities/vcs-app.entity.ts';
  import { gitProvidersMessages as messages } from '@base/features/integrations/presentation/messages/git-providers.messages.ts';
  import {
    appSubtitle,
    deliveryPassed,
    deliveryText,
  } from '@base/features/integrations/presentation/presenters/vcs-app.presenter.ts';
  import ProviderTile from '../ProviderTile.svelte';
  import type { GitProvidersPage } from './git-providers-page.state.svelte.ts';

  interface Props {
    page: GitProvidersPage;
    app: VcsAppEntity;
  }

  let { page, app }: Props = $props();

  const delivery = $derived.by(() => {
    if (!app.lastDeliveryAt) {
      return { icon: CircleDashedIcon, tone: '[&>svg]:text-muted-foreground' };
    }
    return deliveryPassed(app)
      ? { icon: CircleCheckIcon, tone: '[&>svg]:text-success' }
      : { icon: TriangleAlertIcon, tone: '[&>svg]:text-warning' };
  });
  const DeliveryIcon = $derived(delivery.icon);
  // A phone puts the name of a row above its value.
  const ROW = 'flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3';
  const TERM = 'shrink-0 text-xs text-muted-foreground sm:w-36';
</script>

<div class="flex items-center gap-3">
  <ProviderTile provider={app.provider} />
  <div class="flex min-w-0 grow flex-col gap-0.5">
    <h2 class="truncate text-sm">{app.name}</h2>
    <p class="truncate text-xs text-muted-foreground">{appSubtitle(app)}</p>
  </div>
  <Badge variant="outline" class="[&>svg]:text-success">
    <CircleCheckIcon aria-hidden="true" />
    {t(messages.active)}
  </Badge>
</div>

{#if app.managedBySettings}
  <p class="rounded-lg border px-3 py-2 text-sm text-muted-foreground">{t(messages.managed)}</p>
{/if}

<dl class="flex flex-col gap-4">
  <div class={ROW}>
    <dt class={TERM}>{t(messages.webhookUrl)}</dt>
    <dd class="flex min-w-0 grow items-center rounded-lg border bg-muted/50 px-3 py-2 text-sm">
      <CopyableText value={app.webhookUrl} class="w-full justify-between" />
    </dd>
  </div>
  <div class={ROW}>
    <dt class={TERM}>{t(messages.lastDelivery)}</dt>
    <dd class="flex items-center">
      <Badge variant="outline" class={delivery.tone} data-delivery={app.lastDeliveryStatus}>
        <DeliveryIcon aria-hidden="true" />
        {deliveryText(app)}
      </Badge>
    </dd>
  </div>
  {#if !app.managedBySettings}
    <div class={ROW}>
      <dt class={TERM}>{t(messages.permissions)}</dt>
      <dd class="font-mono text-xs">{t(messages.permissionList)}</dd>
    </div>
  {/if}
</dl>

<div class="flex flex-wrap items-center gap-2">
  <a
    href={app.webUrl}
    target="_blank"
    rel="noopener noreferrer"
    class={buttonVariants({ variant: 'outline', size: 'sm' })}
  >
    {t(messages.openOnGitHub)}
    <ExternalLinkIcon class="size-3.5" aria-hidden="true" />
  </a>
  {#if !app.managedBySettings}
    <GatedButton
      variant="ghost-destructive"
      size="sm"
      allowed={page.canManage}
      deniedReason={t(messages.onlyAdmins)}
      onclick={() => page.setConfirming(true)}
    >
      {t(messages.removeApp)}
    </GatedButton>
  {/if}
</div>
