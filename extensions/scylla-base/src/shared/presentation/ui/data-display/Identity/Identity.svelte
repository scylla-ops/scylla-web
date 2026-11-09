<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import IdentityAvatar from '../IdentityAvatar/IdentityAvatar.svelte';
  import { userIdentityMessages } from '@shared/presentation/messages/user-identity.messages.ts';
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
    /** `row`: the avatar and two lines, for a table. `cell`: one short line, for a small list. */
    format?: 'row' | 'cell';
    class?: string;
  }

  let {
    profile,
    kind = 'person',
    self = false,
    missing = 'deleted',
    format = 'row',
    class: className,
  }: Props = $props();

  const name = $derived(userName(profile, missing));
  const isSelf = $derived(!!profile && kind === 'person' && self);
  const secondary = $derived(profile ? identitySecondaryLine(profile, kind) : undefined);
  const kindLabel = $derived(profile ? identityKindLabel(kind) : undefined);
</script>

{#snippet nameText(size: string)}
  <span
    class={cn('truncate', size, profile ? 'font-semibold' : 'italic text-muted-foreground')}
    title={name}
  >
    {name}
  </span>
  {#if isSelf}
    <span
      class="shrink-0 rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold text-primary-foreground"
    >
      {t(userIdentityMessages.you)}
    </span>
  {/if}
{/snippet}

{#if format === 'cell'}
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
