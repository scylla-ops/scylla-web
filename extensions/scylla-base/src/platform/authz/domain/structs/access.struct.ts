import type { Permission } from './permission.struct.ts';

export type AccessSpec =
  | { kind: 'fullControl' }
  | { kind: 'restricted'; permissions: Permission[] };

/** `unknown`: an access arm newer than this build. Never read it as "no permission". */
export type Access = AccessSpec | { kind: 'unknown' };

/** Holding a listed permission is holding the key. `unknown` confers nothing. */
export const accessConfers = (access: Access, permission: Permission): boolean => {
  switch (access.kind) {
    case 'fullControl':
      return true;
    case 'restricted':
      return access.permissions.includes(permission);
    default:
      return false;
  }
};
