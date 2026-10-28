import { createStore } from '@scylla/ui/stores';
import type { EffectivePermissions } from '@platform/authz/domain/structs/effective-permissions.struct.ts';

interface PermissionsState {
  /** `null` until the first load. */
  permissions: EffectivePermissions | null;
  setPermissions: (permissions: EffectivePermissions | null) => void;
}

/** Not persisted. Written only by `syncMyPermissions` in `features/roles`. */
export const permissionsStore = createStore<PermissionsState>(set => ({
  permissions: null,
  setPermissions: permissions => set({ permissions }),
}));
