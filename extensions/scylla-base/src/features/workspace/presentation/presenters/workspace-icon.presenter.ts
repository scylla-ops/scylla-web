import BuildingIcon from '@lucide/svelte/icons/building';
import { imageUrl } from '@platform/grpc';
import { entityGlyph, type EntityIconProps, type IconChoice } from '@scylla/ui';
import type {
  CustomIcon,
  CustomIconChange,
} from '@shared/domain/structs/custom-icon.struct.ts';

/** The icon of a workspace with no icon: a building in grey. */
export const DEFAULT_WORKSPACE_GLYPH = 'building';
export const DEFAULT_WORKSPACE_COLOR = 'muted-foreground';

/**
 * What the entity icon of a workspace shows. A glyph that this build does not know, and an image
 * that does not load, show the building.
 */
export const workspaceIconProps = (icon: CustomIcon | undefined): EntityIconProps => {
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

/** The choice of the icon picker when it opens on a workspace. */
export const workspaceIconChoice = (icon: CustomIcon | undefined): IconChoice => {
  switch (icon?.kind) {
    case 'image':
      return { kind: 'image', url: imageUrl(icon.imageId) };
    case 'glyph':
      return { kind: 'glyph', name: icon.name, color: icon.color ?? DEFAULT_WORKSPACE_COLOR };
    default:
      return { kind: 'default' };
  }
};

/**
 * The change that a choice of the picker makes. Undefined when the icon stays: the image that the
 * workspace has, or the default icon of a workspace that has no icon.
 */
export const workspaceIconChange = async (
  choice: IconChoice,
  current: CustomIcon | undefined,
): Promise<CustomIconChange | undefined> => {
  switch (choice.kind) {
    case 'image':
      return choice.file
        ? { kind: 'image', data: new Uint8Array(await choice.file.arrayBuffer()) }
        : undefined;
    case 'glyph':
      return { kind: 'glyph', name: choice.name, color: choice.color };
    default:
      return current ? { kind: 'default' } : undefined;
  }
};
