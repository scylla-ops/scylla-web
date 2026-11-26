// The custom icons of the things of a workspace share one message: `scylla.common.v1.Icon`.

import type { Avatar, Icon, IconChange } from '@base/generated/scylla/common/v1/icon.ts';
import type {
  CustomIcon,
  CustomIconChange,
} from '@shared/domain/structs/custom-icon.struct.ts';
import { idValue } from './wrappers.ts';

/** An icon with no kind (a newer server) shows as the default icon. */
export function iconToDomain(icon: Icon | undefined): CustomIcon | undefined {
  switch (icon?.kind.oneofKind) {
    case 'glyph':
      return {
        kind: 'glyph',
        name: icon.kind.glyph.name,
        ...(icon.kind.glyph.color && { color: icon.kind.glyph.color }),
      };
    case 'imageId':
      return { kind: 'image', imageId: idValue(icon.kind.imageId) };
    default:
      return undefined;
  }
}

/** No kind: the thing takes the default icon again. */
export function iconChangeToProto(change: CustomIconChange): IconChange {
  switch (change.kind) {
    case 'glyph':
      return { kind: { oneofKind: 'glyph', glyph: { name: change.name, color: change.color } } };
    case 'image':
      return { kind: { oneofKind: 'image', image: change.data } };
    default:
      return { kind: { oneofKind: undefined } };
  }
}

/** How an actor shows, in the fields of `AvatarLook` (`@shared/presentation/ui`). */
export interface ActorLook {
  avatarUrl?: string;
  avatarColor?: string;
  avatarGlyph?: string;
}

/**
 * The photo or the color of the initials of a person, or the icon of an app, of an actor of a
 * list (`avatar` and `icon` of a member or of a holder of a role). `imageUrl` gives the URL of an
 * image id (`@platform/grpc`, which `shared/` cannot import).
 */
export function actorLookToDomain(
  { avatar, icon }: { avatar?: Avatar; icon?: Icon },
  imageUrl: (id: string) => string,
): ActorLook {
  const custom = iconToDomain(icon);
  return {
    ...(avatar?.imageId?.value && { avatarUrl: imageUrl(avatar.imageId.value) }),
    ...(avatar?.color && { avatarColor: avatar.color }),
    ...(custom?.kind === 'image' && { avatarUrl: imageUrl(custom.imageId) }),
    ...(custom?.kind === 'glyph' && {
      avatarGlyph: custom.name,
      ...(custom.color && { avatarColor: custom.color }),
    }),
  };
}
