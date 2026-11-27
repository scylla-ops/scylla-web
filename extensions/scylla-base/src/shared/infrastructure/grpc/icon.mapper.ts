// The custom icons of the things of a workspace share one message: `scylla.common.v1.Icon`.

import {
  GlyphFill as GrpcGlyphFill,
  GlyphFlip as GrpcGlyphFlip,
  type Avatar,
  type GlyphAvatar as GrpcGlyphAvatar,
  type GlyphPaint as GrpcGlyphPaint,
  type Icon,
  type IconChange,
} from '@base/generated/scylla/common/v1/icon.ts';
import type { GlyphAvatar, GlyphFill, GlyphFlip, GlyphPaint } from '@scylla/ui/structs';
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
      return {
        kind: 'image',
        imageId: idValue(icon.kind.imageId),
        ...(icon.glyphAvatar && { glyph: glyphAvatarToDomain(icon.glyphAvatar) }),
      };
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
    case 'avatar':
      return {
        kind: { oneofKind: 'glyphAvatar', glyphAvatar: glyphAvatarToProto(change.avatar) },
      };
    default:
      return { kind: { oneofKind: undefined } };
  }
}

const FILLS: Record<GrpcGlyphFill, GlyphFill> = {
  [GrpcGlyphFill.UNSPECIFIED]: 'solid',
  [GrpcGlyphFill.LINEAR]: 'linear',
  [GrpcGlyphFill.RADIAL]: 'radial',
};
const FLIPS: Record<GrpcGlyphFlip, GlyphFlip> = {
  [GrpcGlyphFlip.UNSPECIFIED]: 'none',
  [GrpcGlyphFlip.HORIZONTAL]: 'horizontal',
  [GrpcGlyphFlip.VERTICAL]: 'vertical',
  [GrpcGlyphFlip.BOTH]: 'both',
};
const reverse = <K extends string, V extends number>(table: Record<V, K>) =>
  Object.fromEntries(Object.entries(table).map(([value, key]) => [key, Number(value)])) as Record<
    K,
    V
  >;
const GRPC_FILLS = reverse<GlyphFill, GrpcGlyphFill>(FILLS);
const GRPC_FLIPS = reverse<GlyphFlip, GrpcGlyphFlip>(FLIPS);

const paintToDomain = (paint: GrpcGlyphPaint | undefined): GlyphPaint => ({
  colors: paint?.colors.length ? [...paint.colors] : ['#ffffff'],
  fill: FILLS[paint?.fill ?? GrpcGlyphFill.UNSPECIFIED] ?? 'solid',
  angle: paint?.angle ?? 0,
});

const paintToProto = (paint: GlyphPaint): GrpcGlyphPaint => ({
  colors: [...paint.colors],
  fill: GRPC_FILLS[paint.fill],
  angle: paint.angle,
});

/** The options of a glyph avatar. A fill or a flip of a newer server shows as the default. */
export function glyphAvatarToDomain(avatar: GrpcGlyphAvatar): GlyphAvatar {
  return {
    shape: avatar.shape,
    glyph: paintToDomain(avatar.glyph),
    background: paintToDomain(avatar.background),
    flip: FLIPS[avatar.flip] ?? 'none',
    rotate: avatar.rotate,
    scale: avatar.scale || 100,
  };
}

export function glyphAvatarToProto(avatar: GlyphAvatar): GrpcGlyphAvatar {
  return {
    shape: avatar.shape,
    glyph: paintToProto(avatar.glyph),
    background: paintToProto(avatar.background),
    flip: GRPC_FLIPS[avatar.flip],
    rotate: avatar.rotate,
    scale: avatar.scale,
  };
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
