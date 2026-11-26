<script lang="ts">
  import { EntityIcon, swapIn, swapOut, type EntityIconSize } from '@scylla/ui';
  import type { CustomIcon } from '@shared/domain/structs/custom-icon.struct.ts';
  import { workspaceIconProps } from '../../presenters/workspace-icon.presenter.ts';

  interface Props {
    icon: CustomIcon | undefined;
    size?: EntityIconSize;
    /** The accessible name. With none, the icon is decorative. */
    label?: string;
    class?: string;
  }

  let { icon, size = 36, label, class: className }: Props = $props();

  const iconKey = $derived(JSON.stringify(icon ?? null));
</script>

<!-- The one place that draws the icon of a workspace in this feature. A new icon grows in over the
     old one, in the same grid cell: the place keeps its size. -->
<span data-slot="workspace-icon" class="grid shrink-0 place-items-center">
  {#key iconKey}
    <span class="col-start-1 row-start-1 flex" in:swapIn out:swapOut>
      <EntityIcon {...workspaceIconProps(icon)} {size} {label} class={className} />
    </span>
  {/key}
</span>
