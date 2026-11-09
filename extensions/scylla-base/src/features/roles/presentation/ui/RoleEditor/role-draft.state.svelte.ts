import type { RoleEntity, RoleHolder, RoleLevel } from '../../../domain/entities/role.entity.ts';
import {
  fitToRole,
  withoutImplicit,
  type CatalogArea,
} from '../../../domain/structs/catalog.struct.ts';

/** What a copy starts from: a role, or the empty role. */
export type CopySource = RoleEntity | 'empty';

interface Snapshot {
  level: RoleLevel;
  holder: RoleHolder;
  selected: Set<string>;
}

/** The level, the holder and the permissions of the role in the editor, and the last copy. */
export const createRoleDraft = (
  role: RoleEntity | undefined,
  areas: () => readonly CatalogArea[],
) => {
  let level = $state<RoleLevel>(role?.level ?? 'workspace');
  let holder = $state<RoleHolder>(role?.holder ?? 'people');
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- replaced on each change, never changed in place
  let selected = $state<Set<string>>(new Set(role?.permissions ?? []));
  let source = $state<CopySource | null>(null);
  let before = $state<Snapshot | null>(null);

  /** Keeps what the level can hold, and adds what is always on. */
  const fit = () => {
    selected = fitToRole(withoutImplicit(selected, areas()), areas(), level, holder);
  };

  return {
    get level() {
      return level;
    },
    get holder() {
      return holder;
    },
    get selected() {
      return selected;
    },
    /** The last copy, until an undo. */
    get source() {
      return source;
    },
    fit,
    chooseLevel: (next: RoleLevel) => {
      level = next;
      if (next === 'platform') holder = 'people';
      fit();
    },
    chooseHolder: (next: RoleHolder) => {
      holder = next;
      fit();
    },
    change: (next: Set<string>) => {
      selected = next;
    },
    /** Takes the level, the holder and the permissions of the source. The empty role clears all. */
    copy: (from: CopySource) => {
      before = { level, holder, selected };
      if (from !== 'empty') {
        level = from.level;
        holder = from.holder;
      }
      const copied = from === 'empty' ? [] : from.permissions;
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- read once by fitToRole
      selected = fitToRole(new Set(copied), areas(), level, holder);
      source = from;
    },
    /** Puts back the level, the holder and the permissions from before the last copy. */
    undo: () => {
      if (!before) return;
      level = before.level;
      holder = before.holder;
      selected = before.selected;
      before = null;
      source = null;
    },
  };
};

export type RoleDraft = ReturnType<typeof createRoleDraft>;
