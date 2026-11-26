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

/** How an agent shows in `IdentityAvatar`: its name, and the icon that an admin chose. */
export const agentProfile = (agent: Pick<AppEntity, 'name' | 'icon'>): UserIdentityProfile => {
  const profile = { username: '', displayName: agent.name };
  switch (agent.icon?.kind) {
    case 'image':
      return { ...profile, avatarUrl: imageUrl(agent.icon.imageId) };
    case 'glyph':
      return {
        ...profile,
        avatarGlyph: agent.icon.name,
        avatarColor: agent.icon.color ?? DEFAULT_AGENT_COLOR,
      };
    default:
      return profile;
  }
};

/** The choice of the icon picker when it opens on an agent. */
export const agentIconChoice = (icon: CustomIcon | undefined): IconChoice => {
  switch (icon?.kind) {
    case 'image':
      return { kind: 'image', url: imageUrl(icon.imageId) };
    case 'glyph':
      return { kind: 'glyph', name: icon.name, color: icon.color ?? DEFAULT_AGENT_COLOR };
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
