<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { IdentityAvatar, identityKindOf } from '@shared/presentation/ui';
  import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
  import { holderCount } from '../../messages/roles.messages.ts';
  import { holderStack } from '../../presenters/holder-stack.presenter.ts';
  import { roleQueries } from '../../roles.queries.ts';

  interface Props {
    role: RoleEntity;
    workspaceId?: string;
    canSeeHolders: boolean;
  }

  let { role, workspaceId, canSeeHolders }: Props = $props();

  /** The first avatar is on top. */
  const LAYERS = ['z-30', 'z-20', 'z-10'];

  const holdersQuery = createQuery(() =>
    roleQueries.holders(role.key, workspaceId, {
      enabled: canSeeHolders && role.holderCount > 0,
    }),
  );
  const stack = $derived(holdersQuery.data ? holderStack(holdersQuery.data) : undefined);
</script>

<span class="flex items-center gap-2 text-xs text-muted-foreground">
  {#if stack && stack.shown.length > 0}
    <span
      data-slot="holder-stack"
      class="isolate flex items-center"
      title={stack.shown.map(holder => holder.displayName).join(', ')}
    >
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
      <span class="flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 font-medium">
        +{stack.more}
      </span>
    {/if}
  {/if}
  <span class="whitespace-nowrap tabular-nums">{t(holderCount(role.holderCount))}</span>
</span>
