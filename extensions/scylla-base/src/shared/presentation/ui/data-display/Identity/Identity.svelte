<script lang="ts">
  import BlocksIcon from '@lucide/svelte/icons/blocks';
  import BotIcon from '@lucide/svelte/icons/bot';
  import XIcon from '@lucide/svelte/icons/x';
  import { t } from '@scylla/ui/i18n';
  import { Badge } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import IdentityAvatar from '../IdentityAvatar/IdentityAvatar.svelte';
  import {
    removeIdentity,
    userIdentityMessages,
  } from '@shared/presentation/messages/user-identity.messages.ts';
  import {
    identityKindLabel,
    identitySecondaryLine,
    userName,
    type IdentityKind,
    type MissingUser,
    type UserIdentityProfile,
  } from '@shared/presentation/presenters/user-identity.presenter.ts';

  interface Props {
    /** `undefined`: a missing actor, named after `missing`. */
    profile: UserIdentityProfile | undefined;
    kind?: IdentityKind;
    /** The person who reads the page. */
    self?: boolean;
    missing?: MissingUser;
    /**
     * `mention`: in a sentence. `chip`: a picked actor. `cell`: one short line, for a small list
     * or an option. `row`: the avatar and two lines, for a table. `header`: the title of a page.
     */
    format?: 'mention' | 'chip' | 'cell' | 'row' | 'header';
    /** A `chip` with a remove button. */
    onRemove?: () => void;
    class?: string;
  }

  let {
    profile,
    kind = 'person',
    self = false,
    missing = 'deleted',
    format = 'row',
    onRemove,
    class: className,
  }: Props = $props();

  const name = $derived(userName(profile, missing));
  const isSelf = $derived(!!profile && kind === 'person' && self);
  /** In a sentence or a chip, the reader is "You". */
  const shortName = $derived(isSelf ? t(userIdentityMessages.you) : name);
  const secondary = $derived(profile ? identitySecondaryLine(profile, kind) : undefined);
  const kindLabel = $derived(profile ? identityKindLabel(kind) : undefined);
  const nameLook = $derived(profile ? 'font-semibold' : 'italic text-muted-foreground');
  const missingLook = $derived(!profile && 'font-normal italic text-muted-foreground');
</script>

{#snippet nameText(size: string)}
  <span class={cn('truncate', size, nameLook)} title={name}>{name}</span>
  {#if isSelf}
    <span
      class="shrink-0 rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold text-primary-foreground"
    >
      {t(userIdentityMessages.you)}
    </span>
  {/if}
{/snippet}

{#snippet headerBadge()}
  {#if isSelf}
    <Badge class="h-[22px]">{t(userIdentityMessages.you)}</Badge>
  {:else if profile && kind !== 'person'}
    <Badge variant="secondary" class="h-[22px]">
      {#if kind === 'agent'}<BotIcon />{:else}<BlocksIcon />{/if}
      {kindLabel}
    </Badge>
  {:else if profile?.username}
    <Badge variant="secondary" class="h-[22px]">@{profile.username}</Badge>
  {/if}
{/snippet}

{#if format === 'mention'}
  <span class={cn('inline-flex max-w-full min-w-0 items-center gap-1.5 align-bottom', className)}>
    <IdentityAvatar {profile} {kind} {self} size={16} />
    <span class={cn('truncate text-sm font-medium', missingLook)} title={name}>{shortName}</span>
  </span>
{:else if format === 'chip'}
  <span
    class={cn(
      'inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border bg-card py-[3px] pl-[3px] text-xs font-medium',
      onRemove ? 'pr-1.5' : 'pr-2',
      className,
    )}
  >
    <IdentityAvatar {profile} {kind} {self} size={16} />
    <span class={cn('truncate', missingLook)} title={name}>{shortName}</span>
    {#if onRemove}
      <button
        type="button"
        class="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
        aria-label={t(removeIdentity(shortName))}
        onclick={onRemove}
      >
        <XIcon class="size-3" />
      </button>
    {/if}
  </span>
{:else if format === 'header'}
  <div class={cn('flex min-w-0 items-center gap-4', className)}>
    <IdentityAvatar {profile} {kind} {self} size={48} />
    <div class="flex min-w-0 flex-col gap-1">
      <div class="flex min-w-0 items-center gap-2.5">
        <h1 class={cn('truncate text-2xl leading-8 sm:text-2xl', missingLook)} title={name}>
          {name}
        </h1>
        {@render headerBadge()}
      </div>
      {#if kind === 'person' && profile?.email}
        <span class="truncate text-xs text-muted-foreground">{profile.email}</span>
      {/if}
    </div>
  </div>
{:else if format === 'cell'}
  <span class={cn('flex min-w-0 items-center gap-2', className)}>
    <IdentityAvatar {profile} {kind} {self} size={24} />
    {@render nameText('text-sm')}
    {#if kindLabel}
      <span class="shrink-0 text-xs text-muted-foreground">{kindLabel}</span>
    {/if}
  </span>
{:else}
  <span class={cn('flex min-w-0 items-center gap-3', className)}>
    <IdentityAvatar {profile} {kind} {self} />
    <span class="flex min-w-0 flex-col gap-0.5 text-left">
      <span class="flex min-w-0 items-center gap-1.5">
        {@render nameText('text-sm leading-tight')}
      </span>
      {#if secondary}
        <span class="truncate text-xs leading-tight text-muted-foreground" title={secondary}>
          {secondary}
        </span>
      {/if}
    </span>
  </span>
{/if}
