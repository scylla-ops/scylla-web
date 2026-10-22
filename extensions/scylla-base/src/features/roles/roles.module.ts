import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import ShieldIcon from '@lucide/svelte/icons/shield';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { GrantServiceClient } from '@base/generated/scylla/authz/v1/grant.client.ts';
import { RoleServiceClient } from '@base/generated/scylla/authz/v1/role.client.ts';
import { DefaultPermissionRepository } from './infrastructure/default-permission.repository.ts';
import { UpdateRoleUseCase } from '@base/features/roles/domain/use-cases/update-role.use-case.ts';

const repository = new DefaultPermissionRepository(
  new RoleServiceClient(grpcTransport.getTransport()),
  new GrantServiceClient(grpcTransport.getTransport()),
);

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
        children: [
          {
            path: 'new',
            permission: Permission.MANAGE_ORG_ROLES,
            breadcrumb: () => ({ label: msg`New role` }),
            page: () => import('./presentation/ui/RoleEditor/RoleEditor.page.svelte'),
          },
          {
            path: ':roleId/edit',
            permission: Permission.MANAGE_ORG_ROLES,
            breadcrumb: () => ({ label: msg`Edit role` }),
            page: () => import('./presentation/ui/RoleEditor/RoleEditor.page.svelte'),
          },
        ],
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
        children: [
          {
            path: 'new',
            permission: Permission.MANAGE_ROLES,
            breadcrumb: () => ({ label: msg`New role` }),
            page: () => import('./presentation/ui/PlatformRoleEditor/PlatformRoleEditor.page.svelte'),
          },
          {
            path: ':roleId/edit',
            permission: Permission.MANAGE_ROLES,
            breadcrumb: () => ({ label: msg`Edit role` }),
            page: () => import('./presentation/ui/PlatformRoleEditor/PlatformRoleEditor.page.svelte'),
          },
        ],
      },
    ],
  },
} satisfies ScyllaModule;
