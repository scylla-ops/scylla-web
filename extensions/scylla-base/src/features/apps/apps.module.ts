import type { ScyllaModule } from '@scylla/core-sdk';
import { AppsRemoteDataSourceImpl } from '@base/features/apps/infrastructure/data/apps-remote.data-source.ts';
import { grpcTransport } from '@platform/grpc';
import { DefaultAppsRepository } from '@base/features/apps/infrastructure/repository/default-apps.repository.ts';

const dataSource = new AppsRemoteDataSourceImpl(grpcTransport);
const repository = new DefaultAppsRepository(dataSource);

export const AppsModule = {
  id: 'apps',
  domain: {
    appsRepository: repository,
  },
} satisfies ScyllaModule;
