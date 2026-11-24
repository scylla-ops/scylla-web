import type {
  CreateRoleInput,
  RoleEntity,
  RoleHolders,
  UpdateRoleInput,
} from '../entities/role.entity.ts';
import type { CatalogArea } from '../structs/catalog.struct.ts';

export interface RoleRepository {
  catalog(): Promise<CatalogArea[]>;
  /** With a workspace: the roles offered in it. Else: the roles of the instance. */
  list(workspaceId?: string): Promise<RoleEntity[]>;
  get(key: string, workspaceId?: string): Promise<RoleEntity>;
  create(input: CreateRoleInput): Promise<RoleEntity>;
  update(input: UpdateRoleInput): Promise<RoleEntity>;
  /** At most 100 grants of a role, with the total. */
  holders(key: string, workspaceId?: string): Promise<RoleHolders>;
  /** With `moveTo`, the holders get that role first. */
  remove(id: string, moveTo?: string): Promise<void>;
  /** Gives roles of the platform level to a user, and takes others back. */
  changeInstanceRoles(userId: string, give: string[], takeBack: string[]): Promise<void>;
}
