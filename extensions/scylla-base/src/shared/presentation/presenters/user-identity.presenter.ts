import { t } from '@scylla/ui/i18n';
import { colorIn, glyphOn, iconColors, isHexColor, toHex, type ColorTheme } from '@scylla/ui/utils';
import { userIdentityMessages } from '../messages/user-identity.messages.ts';

/** What it takes to show a person. A `UserEntity` of `features/user` is one. */
export interface UserIdentityProfile extends AvatarLook {
  username: string;
  displayName?: string;
  email?: string;
}

/** What the owner of an avatar chose. With none, the avatar shows the default look of its kind. */
export interface AvatarLook {
  /** The URL of the photo of a person, or of the image of the icon of an App. */
  avatarUrl?: string;
  /**
   * The color of the initials of a person, or of the glyph of an App: a color of the theme
   * (`chart-2`) or a free color (`#RRGGBB`).
   */
  avatarColor?: string;
  /** The glyph of the icon of an App, a name of `ENTITY_GLYPHS`. */
  avatarGlyph?: string;
}

/** The CSS colors of an avatar: its background and the color of its initials or glyph. */
export interface AvatarColors {
  tile: string;
  ink: string;
}

/**
 * The colors of an avatar in a chosen color. On its tint, as an entity icon (`iconColors`: a free
 * color under 3:1 with the card gets a solid tile). Solid for the reader: the color, with white or
 * near-black initials, the one that contrasts more with the color in this theme. A color of the
 * theme that `THEME_COLORS` does not know keeps the foreground of the main color.
 */
export const avatarColors = (color: string, solid: boolean, theme: ColorTheme): AvatarColors => {
  if (!solid) {
    const { tile, glyph } = iconColors(color, theme);
    return { tile, ink: glyph };
  }
  const rgb = colorIn(color, theme);
  const tile = isHexColor(color) && rgb ? toHex(rgb) : `var(--${color})`;
  return { tile, ink: rgb ? glyphOn(rgb) : 'var(--primary-foreground)' };
};

/**
 * Why a user can be missing. `deleted`: the account does not exist any more. `unknown`: the page
 * cannot read who it is (a grant list without the directory); a grant never outlives its user.
 */
export type MissingUser = 'deleted' | 'unknown';

/** The display name, else the username. A missing user is never shown by its id. */
export const userName = (
  user: UserIdentityProfile | undefined,
  missing: MissingUser = 'deleted',
): string => {
  if (user) return user.displayName || user.username;
  return t(
    missing === 'unknown' ? userIdentityMessages.unknownUser : userIdentityMessages.deletedUser,
  );
};

/** The email when it is known, else the handle. An account can have neither. */
export const userSecondaryLine = (user: UserIdentityProfile): string =>
  user.email || (user.username ? `@${user.username}` : "");

/** The first letters of the first two words of the name. */
export const userInitials = (user: UserIdentityProfile): string =>
  (user.displayName || user.username)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => [...word][0])
    .join('')
    .toUpperCase();

/** How an actor shows: a person, an App that runs jobs (an agent), or another App. */
export type IdentityKind = 'person' | 'agent' | 'app';

/** The server names a person `user`. Any other actor is an App, and `runner` makes it an agent. */
export const identityKindOf = (actor: { actorKind: string; runner: boolean }): IdentityKind => {
  if (actor.actorKind === 'user') return 'person';
  return actor.runner ? 'agent' : 'app';
};

/** The word that names a machine. A person has none: the name tells it. */
export const identityKindLabel = (kind: IdentityKind): string | undefined => {
  if (kind === 'person') return undefined;
  return t(kind === 'agent' ? userIdentityMessages.agent : userIdentityMessages.app);
};

/** The second line of a row: the email or the handle of a person, the kind of a machine. */
export const identitySecondaryLine = (profile: UserIdentityProfile, kind: IdentityKind): string =>
  identityKindLabel(kind) ?? userSecondaryLine(profile);
