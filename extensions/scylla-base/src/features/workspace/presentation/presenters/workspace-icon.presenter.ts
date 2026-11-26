import { imageUrl } from '@platform/grpc';
import type { EntityIconProps, IconChoice } from '@scylla/ui';
import type { CustomIcon, CustomIconChange } from '@shared/domain/structs/custom-icon.struct.ts';
import {
  DEFAULT_WORKSPACE_COLOR,
  workspaceIconProps as iconPropsWith,
} from '@shared/presentation/presenters/workspace-icon.presenter.ts';

export {
  DEFAULT_WORKSPACE_COLOR,
  DEFAULT_WORKSPACE_GLYPH,
} from '@shared/presentation/presenters/workspace-icon.presenter.ts';

/** What the entity icon of a workspace shows, with the images of this server. */
export const workspaceIconProps = (icon: CustomIcon | undefined): EntityIconProps =>
  iconPropsWith(icon, imageUrl);

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
    case 'avatar':
      // Only a person or an App takes a glyph avatar: this picker has no Avatar tab.
      return undefined;
    case 'glyph':
      return { kind: 'glyph', name: choice.name, color: choice.color };
    default:
      return current ? { kind: 'default' } : undefined;
  }
};
