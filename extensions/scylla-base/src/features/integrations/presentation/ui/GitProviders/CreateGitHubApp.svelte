<script lang="ts">
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import GlobeIcon from '@lucide/svelte/icons/globe';
  import { GatedButton } from '@scylla/ui';
  import {
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { gitProvidersMessages as messages } from '@base/features/integrations/presentation/messages/git-providers.messages.ts';
  import ProviderTile from '../ProviderTile.svelte';
  import type { AppOwner, GitProvidersPage } from './git-providers-page.state.svelte.ts';

  interface Props {
    page: GitProvidersPage;
  }

  let { page }: Props = $props();

  const OWNERS: readonly AppOwner[] = ['organization', 'account'];
  const ownerLabel = (owner: AppOwner): string =>
    t(owner === 'organization' ? messages.ownerOrganization : messages.ownerAccount);
</script>

<div class="flex items-center gap-3">
  <ProviderTile provider="github" />
  <div class="flex min-w-0 grow flex-col gap-0.5">
    <h2 class="text-sm">{t(messages.githubApp)}</h2>
    <p class="text-xs text-muted-foreground">{t(messages.noApp)}</p>
  </div>
</div>

<div class="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
  <div class="flex flex-col gap-1.5">
    <Label for="app-owner">{t(messages.owner)}</Label>
    <Select
      type="single"
      value={page.owner}
      disabled={!page.canManage || page.creating}
      onValueChange={value => page.setOwner(value as AppOwner)}
    >
      <SelectTrigger id="app-owner" class="w-full">{ownerLabel(page.owner)}</SelectTrigger>
      <SelectContent>
        {#each OWNERS as owner (owner)}
          <SelectItem value={owner} label={ownerLabel(owner)}>{ownerLabel(owner)}</SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>
  {#if page.owner === 'organization'}
    <div class="flex flex-col gap-1.5">
      <Label for="app-organization">{t(messages.organization)}</Label>
      <Input
        id="app-organization"
        value={page.organization}
        placeholder="acme"
        autocomplete="off"
        spellcheck={false}
        disabled={!page.canManage || page.creating}
        aria-invalid={page.organizationError ? 'true' : undefined}
        aria-describedby={page.organizationError ? 'app-organization-error' : undefined}
        oninput={event => page.setOrganization(event.currentTarget.value)}
        onblur={page.touch}
      />
      {#if page.organizationError}
        <p id="app-organization-error" role="alert" class="text-xs text-destructive">
          {page.organizationError}
        </p>
      {/if}
    </div>
  {/if}
</div>

<div class="flex flex-col gap-1.5">
  <Label for="app-public-url">{t(messages.publicUrl)}</Label>
  <div class="relative flex items-center">
    <GlobeIcon
      class="pointer-events-none absolute left-3 size-4 text-muted-foreground"
      aria-hidden="true"
    />
    <Input
      id="app-public-url"
      class="pl-9 font-mono"
      value={page.publicUrl}
      readonly
      aria-describedby="app-public-url-hint"
    />
  </div>
  <p id="app-public-url-hint" class="text-xs text-muted-foreground">
    {t(messages.publicUrlHint)}
  </p>
</div>

<div class="flex flex-wrap items-center gap-3">
  <GatedButton
    size="sm"
    allowed={page.canManage}
    deniedReason={t(messages.onlyAdmins)}
    disabled={page.creating}
    onclick={page.create}
  >
    {t(messages.create)}
    <ExternalLinkIcon class="size-3.5" aria-hidden="true" />
  </GatedButton>
  <span class="text-xs text-muted-foreground">{t(messages.githubComOnly)}</span>
</div>
{#if page.createError}
  <p role="alert" class="text-sm text-destructive">{page.createError}</p>
{/if}
