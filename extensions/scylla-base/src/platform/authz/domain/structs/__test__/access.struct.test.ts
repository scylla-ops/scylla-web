// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { accessConfers, type Access } from '../access.struct.ts';
import { Permission } from '../permission.struct.ts';

describe('accessConfers', () => {
  it('full control confers every permission', () => {
    expect(accessConfers({ kind: 'fullControl' }, Permission.DELETE_PROJECT)).toBe(true);
  });

  it('a restricted access confers the permissions it lists, and those they imply', () => {
    const access: Access = { kind: 'restricted', permissions: [Permission.MANAGE_ROLES] };
    expect(accessConfers(access, Permission.MANAGE_ROLES)).toBe(true);
    expect(accessConfers(access, Permission.MANAGE_SYSTEM_GRANTS)).toBe(true);
    expect(accessConfers(access, Permission.LIST_USERS)).toBe(false);
  });

  it('an access arm newer than this build confers nothing', () => {
    expect(accessConfers({ kind: 'unknown' }, Permission.READ_PROJECT)).toBe(false);
  });
});
