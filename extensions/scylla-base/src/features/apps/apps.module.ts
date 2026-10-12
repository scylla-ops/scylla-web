import type { ScyllaModule } from '@scylla/core-sdk';
import { AppsRemoteDataSourceImpl } from '@base/features/apps/infrastructure/data/apps-remote.data-source.ts';
import { grpcTransport } from '@platform/grpc';
import { DefaultAppsRepository } from '@base/features/apps/infrastructure/repository/default-apps.repository.ts';
import { ResetAppSecretUseCase } from '@base/features/apps/domain/use-cases/reset-app-secret.use-case.ts';

const dataSource = new AppsRemoteDataSourceImpl(grpcTransport);
const repository = new DefaultAppsRepository(dataSource);

export const AppsModule = {
  id: 'apps',
  domain: {
    appsRepository: repository,
    resetAppSecret: new ResetAppSecretUseCase(repository),
  },
} satisfies ScyllaModule;
