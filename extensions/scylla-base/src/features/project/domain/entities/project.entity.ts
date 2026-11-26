import type { PaginatedList } from '@scylla/ui/structs';

/**
 * The icon that a person chose for a project: a glyph of the icon set with a color of the theme
 * (`chart-2`) or a free color (`#rrggbb`), or an uploaded image. No color: the main color.
 */
export type ProjectIcon =
  { kind: 'glyph'; name: string; color?: string } | { kind: 'image'; imageId: string };

/** A change of the icon: back to the default icon, a glyph, or a new image to upload. */
export type ProjectIconChange =
  | { kind: 'default' }
  | { kind: 'glyph'; name: string; color: string }
  | { kind: 'image'; data: Uint8Array };

export interface ProjectEntity {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  /** Unset: the default icon, a folder in the main color. */
  icon?: ProjectIcon;
  /** The group of the project in its workspace. Unset: no group. */
  groupId?: string;
}

export type ProjectList = PaginatedList<ProjectEntity>;
