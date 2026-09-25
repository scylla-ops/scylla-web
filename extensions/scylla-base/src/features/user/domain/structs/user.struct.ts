import type { PaginatedList } from '@scylla/ui/structs';
import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';

export type UserList = PaginatedList<UserEntity>;
