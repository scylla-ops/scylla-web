<script lang="ts">
  import type { MemberRoleEntity } from '@base/features/access';
  import { EntityIcon, swapIn, swapOut } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';
  import { createScopeIcon } from '../scope-icon.svelte.ts';
  import { SCOPE_KINDS } from '../scope-kinds.registry.ts';

  interface Props {
    kind: MemberRoleEntity['scopeKind'];
    id?: string;
  }

  let { kind, id }: Props = $props();

  const Icon = $derived(SCOPE_KINDS[kind].icon);
  const scopeIcon = createScopeIcon(
    () => kind,
    () => id,
  );
  /** The workspace is the parent: its tile is larger than the tiles of its projects. */
  const big = $derived(kind === 'workspace');
</script>

<span
  data-part="scope-tile"
  class={cn('grid shrink-0 place-items-center *:col-start-1 *:row-start-1', big ? 'size-8' : 'size-6')}
  aria-hidden="true"
>
  {#if scopeIcon.props}
    <span class="flex" in:swapIn out:swapOut>
      <EntityIcon {...scopeIcon.props} size={big ? 32 : 24} />
    </span>
  {:else}
    <span
      class={cn(
        'flex items-center justify-center rounded-lg border bg-muted',
        big ? 'size-8' : 'size-6 rounded-md',
      )}
      in:swapIn
      out:swapOut
    >
      <Icon class={big ? 'size-4' : 'size-3.5'} />
    </span>
  {/if}
</span>
