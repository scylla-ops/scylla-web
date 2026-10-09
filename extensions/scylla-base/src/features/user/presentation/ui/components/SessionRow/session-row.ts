import { t } from '@scylla/ui/i18n';
import { getRelativeTime } from '@shared/utils/date-utils.ts';
import type { UserSessionEntity } from '../../../../domain/entities/user-session.entity.ts';
import type { SessionDevice } from '../../../user-agent.calculator.ts';
import { userMessages } from '../../user.messages.ts';

/** The server moves the last activity at most once every five minutes. */
const ACTIVE_NOW_MS = 5 * 60 * 1000;

/** "<browser> on <system>". An API client shows its name alone. */
export const sessionTitle = (device: SessionDevice): string => {
  if (!device.browser) return t(userMessages.unknownDevice);
  if (device.kind === 'api' || !device.system) return device.browser;
  return t(userMessages.sessionDevice(device.browser, device.system));
};

/**
 * "<ip> · Active now", or "<ip> · Last active <relative time>". A named API client starts with
 * "API client".
 */
export const sessionActivity = (
  device: SessionDevice,
  session: UserSessionEntity,
  now: number,
): string => {
  const lastActive = Date.parse(session.lastActiveAt);
  let activity: string | undefined;
  if (!Number.isNaN(lastActive)) {
    activity =
      now - lastActive < ACTIVE_NOW_MS
        ? t(userMessages.activeNow)
        : t(userMessages.lastActive(getRelativeTime(session.lastActiveAt)));
  }
  const client = device.kind === 'api' ? t(userMessages.apiClient) : undefined;
  return [client, session.ipAddress, activity].filter(Boolean).join(' · ');
};
