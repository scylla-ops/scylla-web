import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import ShieldIcon from '@lucide/svelte/icons/shield';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { GrpcPermissionRemoteDataSource } from '@base/features/roles/infrastructure/data/grpc-permission-remote.data-source.ts';
import { DefaultPermissionRepository } from '@base/features/roles/infrastructure/repository/default-permission.repository.ts';
import { UpdateRoleUseCase } from '@base/features/roles/domain/use-cases/update-role.use-case.ts';

const dataSource = new GrpcPermissionRemoteDataSource(grpcTransport);
const repository = new DefaultPermissionRepository(dataSource);

export const RolesModule = {
  id: 'roles',
  domain: {
    permissionRepository: repository,
    updateRole: new UpdateRoleUseCase(repository),
  },
  routes: {
    organization: [
      {
        path: 'roles',
        permission: Permission.MANAGE_ORG_ROLES,
        breadcrumb: () => ({ label: msg`Roles` }),
        page: () => import('./presentation/ui/Roles/Roles.page.svelte'),
        nav: { section: 'organization', title: msg`Roles`, icon: ShieldIcon, order: 35 },
      },
      {
        path: 'platform-roles',
        permission: Permission.MANAGE_ROLES,
        breadcrumb: () => ({ label: msg`Platform roles` }),
        page: () => import('./presentation/ui/PlatformRoles/PlatformRoles.page.svelte'),
        nav: {
          section: 'system',
          title: msg`Platform roles`,
          icon: ShieldCheckIcon,
          order: 20,
        },
      },
    ],
  },
} satisfies ScyllaModule;
