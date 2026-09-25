import type { ScyllaModule } from '@scylla/core-sdk';
import { LoginModule } from '@base/features/login/login.module.ts';
import { MarketplaceModule } from '@base/features/marketplace/marketplace.module.ts';
import { PipelineModule } from '@base/features/pipeline/pipeline.module.ts';
import { OrganizationModule } from '@base/features/organization/organization.module.ts';
import { ProjectModule } from '@base/features/project/project.module.ts';
import { JobsModule } from '@base/features/jobs/jobs.module.ts';
import { UserModule } from '@base/features/user/user.module.ts';
import { AppsModule } from '@base/features/apps/apps.module.ts';
import { AgentsModule } from '@base/features/agents/agents.module.ts';
import { SecretModule } from '@base/features/secret/secret.module.ts';
import { RolesModule } from '@base/features/roles/roles.module.ts';
import { TriggersModule } from '@base/features/triggers/triggers.module.ts';
import { DashboardModule } from '@base/features/dashboard/dashboard.module.ts';
import { MembershipModule } from '@base/features/membership/membership.module.ts';
import { ExtensionsModule } from '@base/features/extensions/extensions.module.ts';

/**
 * Every feature module, in the order of the sidebar. Import the `<name>.module.ts`,
 * never the module's `index.ts`: its UI would end up in the entry chunk.
 */
export const modules = [
  LoginModule,
  DashboardModule,
  ProjectModule,
  PipelineModule,
  JobsModule,
  TriggersModule,
  SecretModule,
  MembershipModule,
  OrganizationModule,
  UserModule,
  RolesModule,
  AgentsModule,
  AppsModule,
  MarketplaceModule,
  ExtensionsModule,
] as const satisfies readonly ScyllaModule[];
