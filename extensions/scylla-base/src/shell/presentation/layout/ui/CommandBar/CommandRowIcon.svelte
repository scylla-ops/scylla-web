<script lang="ts">
  import { ColorGlyph, EntityIcon, StatusShape, swapIn, swapOut } from '@scylla/ui';
  import IdentityAvatar from '@shared/presentation/ui/data-display/IdentityAvatar/IdentityAvatar.svelte';
  import type { CommandRow } from './command-row.ts';

  interface Props {
    row: Pick<CommandRow, 'icon' | 'look' | 'iconColor' | 'iconKey'>;
  }

  let { row }: Props = $props();
</script>

<!-- One cell of 20 px for each kind of icon: the names of the rows start at the same place. A new
     icon grows in over the old one, in the same cell. -->
<span data-slot="command-row-icon" class="grid size-5 shrink-0 place-items-center" aria-hidden="true">
  {#key row.iconKey ?? ''}
    <span class="col-start-1 row-start-1 flex" in:swapIn out:swapOut>
      {#if row.look?.kind === 'project' || row.look?.kind === 'workspace'}
        <EntityIcon {...row.look.icon} size={20} />
      {:else if row.look?.kind === 'status'}
        <StatusShape state={row.look.state} label={row.look.label} size={16} />
      {:else if row.look}
        <IdentityAvatar profile={row.look.profile} kind={row.look.kind} self={row.look.self} size={20} />
      {:else}
        <ColorGlyph icon={row.icon} color={row.iconColor} />
      {/if}
    </span>
  {/key}
</span>
