<script lang="ts">
  import { EntityIcon, type EntityIconSize } from '@scylla/ui';
  import type { ProjectIcon } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectIconProps } from '../../presenters/project-icon.presenter.ts';

  interface Props {
    icon: ProjectIcon | undefined;
    size?: EntityIconSize;
    /** The accessible name. With none, the icon is decorative. */
    label?: string;
    class?: string;
  }

  let { icon, size = 36, label, class: className }: Props = $props();
</script>

<!-- The one place that draws the icon of a project: the card, the dialog and the page header. -->
<EntityIcon {...projectIconProps(icon)} {size} {label} class={className} />
