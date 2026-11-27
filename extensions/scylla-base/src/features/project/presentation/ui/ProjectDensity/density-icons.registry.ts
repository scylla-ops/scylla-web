import Grid3x3Icon from '@lucide/svelte/icons/grid-3x3';
import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
import RectangleHorizontalIcon from '@lucide/svelte/icons/rectangle-horizontal';
import Rows3Icon from '@lucide/svelte/icons/rows-3';
import type { LucideIcon } from '@scylla/ui';
import type { ProjectDensity } from '../../presenters/project-density.presenter.ts';

/** The icon of each density, in the menus and on the button « Display ». */
export const DENSITY_ICONS: Record<ProjectDensity, LucideIcon> = {
  comfortable: RectangleHorizontalIcon,
  compact: LayoutGridIcon,
  list: Rows3Icon,
  tiles: Grid3x3Icon,
};
