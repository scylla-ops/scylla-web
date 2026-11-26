import BuildingIcon from '@lucide/svelte/icons/building';
import { entityGlyph, type EntityIconProps } from '@scylla/ui';
import type { CustomIcon } from '@shared/domain/structs/custom-icon.struct.ts';

/** The icon of a workspace with no icon: a building in grey. */
export const DEFAULT_WORKSPACE_GLYPH = 'building';
export const DEFAULT_WORKSPACE_COLOR = 'muted-foreground';

/**
 * What the entity icon of a workspace shows. A glyph that this build does not know, and an image
 * that does not load, show the building. `imageUrl` gives the URL of an image id
 * (`@platform/grpc`, which `shared/` cannot import).
 */
export const workspaceIconProps = (
  icon: CustomIcon | undefined,
  imageUrl: (id: string) => string,
): EntityIconProps => {
  switch (icon?.kind) {
    case 'image':
      return { image: imageUrl(icon.imageId), icon: BuildingIcon };
    case 'glyph':
      return {
        icon: entityGlyph(icon.name) ?? BuildingIcon,
        color: icon.color ?? DEFAULT_WORKSPACE_COLOR,
      };
    default:
      return { icon: BuildingIcon, color: DEFAULT_WORKSPACE_COLOR };
  }
};
