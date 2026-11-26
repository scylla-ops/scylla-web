import { imageUrl } from '@platform/grpc';
import type { IconChoice } from '@scylla/ui';
import type {
  CustomIcon,
  CustomIconChange,
} from '@shared/domain/structs/custom-icon.struct.ts';
import type { UserIdentityProfile } from '@shared/presentation/presenters/user-identity.presenter.ts';
import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';

/** The glyph of an agent with no icon: a bot in the color of the information. */
export const DEFAULT_AGENT_GLYPH = 'bot';
export const DEFAULT_AGENT_COLOR = 'info';

/** The glyph of another app with no icon: blocks in grey, as `IdentityAvatar` shows it. */
export const DEFAULT_APP_GLYPH = 'blocks';
export const DEFAULT_APP_COLOR = 'muted-foreground';

/** The default icon of an app: the one of an agent, or the one of another app. */
export const defaultAppIcon = (runner: boolean): { glyph: string; color: string } =>
  runner
    ? { glyph: DEFAULT_AGENT_GLYPH, color: DEFAULT_AGENT_COLOR }
    : { glyph: DEFAULT_APP_GLYPH, color: DEFAULT_APP_COLOR };

/**
 * How an app shows in `IdentityAvatar`: its name, and the icon that an admin chose. With no
 * `runner`, it is an agent.
 */
export const agentProfile = (
  agent: Pick<AppEntity, 'name' | 'icon'> & { runner?: boolean },
): UserIdentityProfile => {
  const profile = { username: '', displayName: agent.name };
  switch (agent.icon?.kind) {
    case 'image':
      return { ...profile, avatarUrl: imageUrl(agent.icon.imageId) };
    case 'glyph':
      return {
        ...profile,
        avatarGlyph: agent.icon.name,
        avatarColor: agent.icon.color ?? defaultAppIcon(agent.runner ?? true).color,
      };
    default:
      return profile;
  }
};

/** The choice of the icon picker when it opens on an app: an agent by default. */
export const agentIconChoice = (
  icon: CustomIcon | undefined,
  defaultColor = DEFAULT_AGENT_COLOR,
): IconChoice => {
  switch (icon?.kind) {
    case 'image':
      return { kind: 'image', url: imageUrl(icon.imageId) };
    case 'glyph':
      return { kind: 'glyph', name: icon.name, color: icon.color ?? defaultColor };
    default:
      return { kind: 'default' };
  }
};

/**
 * The change that a choice of the picker makes. Undefined when the icon stays: the image that the
 * agent has, or the default icon of an agent that has no icon.
 */
export const agentIconChange = async (
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
