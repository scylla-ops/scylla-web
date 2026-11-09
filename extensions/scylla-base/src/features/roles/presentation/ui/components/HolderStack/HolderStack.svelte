<script lang="ts">
  import { activeWorkspaceSlug } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { HoverCard, HoverCardContent, HoverCardTrigger } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { IdentityAvatar, identityKindOf } from '@shared/presentation/ui';
  import type { RoleEntity } from '@base/features/roles/domain/entities/role.entity.ts';
  import { holderCount } from '@base/features/roles/presentation/messages/roles.messages.ts';
  import { holderCard } from '@base/features/roles/presentation/presenters/holder-card.presenter.ts';
  import { holderStack } from '@base/features/roles/presentation/presenters/holder-stack.presenter.ts';
  import { canSeePeople, roleQueries } from '@base/features/roles/presentation/roles.queries.ts';
  import HolderCard from './HolderCard.svelte';

  interface Props {
    role: RoleEntity;
    workspaceId?: string;
    canSeeHolders: boolean;
  }

  let { role, workspaceId, canSeeHolders }: Props = $props();

  /** The first avatar is on top. */
  const LAYERS = ['z-30', 'z-20', 'z-10'];
  const CELL = 'flex items-center gap-2 text-xs text-muted-foreground';

  const holdersQuery = createQuery(() =>
    roleQueries.holders(role.key, workspaceId, {
      enabled: canSeeHolders && role.holderCount > 0,
    }),
  );
  const slug = activeWorkspaceSlug();
  const pages = $derived(slug && canSeePeople(workspaceId) ? { slug, workspaceId } : undefined);
  const stack = $derived(holdersQuery.data ? holderStack(holdersQuery.data) : undefined);
  const card = $derived(holdersQuery.data ? holderCard(holdersQuery.data, pages) : undefined);
</script>

{#snippet cell()}
  {#if stack && stack.shown.length > 0}
    <span data-slot="holder-stack" class="isolate flex items-center">
      {#each stack.shown as holder, index (holder.actorId)}
        <IdentityAvatar
          profile={{ displayName: holder.displayName, username: holder.handle }}
          kind={identityKindOf(holder)}
          size={24}
          class={cn('ring-2 ring-card', index > 0 && '-ml-1.5', LAYERS[index])}
        />
      {/each}
    </span>
    {#if stack.more > 0}
      <span
        class="flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 font-medium group-data-[state=open]:bg-foreground group-data-[state=open]:text-card"
      >
        +{stack.more}
      </span>
    {/if}
  {/if}
  <span
    class="whitespace-nowrap tabular-nums group-data-[state=open]:text-foreground group-data-[state=open]:underline"
  >
    {t(holderCount(role.holderCount))}
  </span>
{/snippet}

{#if card && card.rows.length > 0}
  <HoverCard openDelay={150}>
    <HoverCardTrigger>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          class={cn(
            CELL,
            'group cursor-pointer rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          )}
        >
          {@render cell()}
        </button>
      {/snippet}
    </HoverCardTrigger>
    <HoverCardContent
      side="top"
      sideOffset={6}
      collisionPadding={8}
      class="flex w-[336px] max-w-[calc(100vw-16px)] flex-col gap-1.5 rounded-[10px] border bg-card px-1.5 pt-2.5 pb-1.5 text-card-foreground shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.08)]"
    >
      <HolderCard {card} />
    </HoverCardContent>
  </HoverCard>
{:else}
  <span class={CELL}>{@render cell()}</span>
{/if}
