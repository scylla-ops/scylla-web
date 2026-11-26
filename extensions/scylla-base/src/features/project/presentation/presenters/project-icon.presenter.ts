import FolderIcon from '@lucide/svelte/icons/folder';
import { imageUrl } from '@platform/grpc';
import { entityGlyph, type EntityIconProps, type IconChoice } from '@scylla/ui';
import type {
  ProjectIcon,
  ProjectIconChange,
} from '@base/features/project/domain/entities/project.entity.ts';

/** The glyph of a project with no icon: a folder in the main color. */
export const DEFAULT_PROJECT_GLYPH = 'folder';

/**
 * What the entity icon of a project shows. A glyph that this build does not know, and an image
 * that does not load, show the folder.
 */
export const projectIconProps = (icon: ProjectIcon | undefined): EntityIconProps => {
  switch (icon?.kind) {
    case 'image':
      return { image: imageUrl(icon.imageId), icon: FolderIcon };
    case 'glyph':
      return { icon: entityGlyph(icon.name) ?? FolderIcon, color: icon.color ?? 'primary' };
    default:
      return { icon: FolderIcon, color: 'primary' };
  }
};

/** The choice of the icon picker when it opens on a project. */
export const projectIconChoice = (icon: ProjectIcon | undefined): IconChoice => {
  switch (icon?.kind) {
    case 'image':
      return { kind: 'image', url: imageUrl(icon.imageId) };
    case 'glyph':
      return { kind: 'glyph', name: icon.name, color: icon.color ?? 'primary' };
    default:
      return { kind: 'default' };
  }
};

/**
 * The change that a choice of the picker makes. Undefined when the icon stays: the image that the
 * project has, or the default icon of a project that has no icon.
 */
export const iconChangeOf = async (
  choice: IconChoice,
  current: ProjectIcon | undefined,
): Promise<ProjectIconChange | undefined> => {
  switch (choice.kind) {
    case 'image':
      return choice.file
        ? { kind: 'image', data: new Uint8Array(await choice.file.arrayBuffer()) }
        : undefined;
    case 'avatar':
      // Only a person or an App takes a glyph avatar: this picker has no Avatar tab.
      return undefined;
    case 'glyph':
      return { kind: 'glyph', name: choice.name, color: choice.color };
    default:
      return current ? { kind: 'default' } : undefined;
  }
};
