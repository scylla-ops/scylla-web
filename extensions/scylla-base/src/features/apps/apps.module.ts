import type { ScyllaModule } from '@scylla/core-sdk';
import { grpcTransport } from '@platform/grpc';
import { AppServiceClient } from '@base/generated/scylla/app/v1/app.client.ts';
import { DefaultAppsRepository } from './infrastructure/default-apps.repository.ts';
import { ResetAppSecretUseCase } from './domain/use-cases/reset-app-secret.use-case.ts';

const repository = new DefaultAppsRepository(new AppServiceClient(grpcTransport.getTransport()));

export const AppsModule = {
  id: 'apps',
  domain: {
    appsRepository: repository,
    resetAppSecret: new ResetAppSecretUseCase(repository),
  },
} satisfies ScyllaModule;
