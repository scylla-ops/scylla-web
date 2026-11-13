import type { VcsApp as GrpcVcsApp } from '@base/generated/scylla/platform/v1/vcs_app_service.ts';
import type { VcsAppEntity } from '@base/features/integrations/domain/entities/vcs-app.entity.ts';
import { idValue, timestampToIsoOpt } from '@shared/infrastructure/grpc/wrappers.ts';
import { knownProvider } from './grpc-vcs-connection.mapper.ts';

export function toDomain(app: GrpcVcsApp): VcsAppEntity {
  return {
    id: idValue(app.id),
    provider: knownProvider(app.provider),
    appId: app.appId,
    slug: app.slug,
    name: app.name,
    owner: app.owner,
    webUrl: app.webUrl,
    webhookUrl: app.webhookUrl,
    lastDeliveryAt: timestampToIsoOpt(app.lastDeliveryAt),
    lastDeliveryStatus: app.lastDeliveryStatus,
    managedBySettings: app.managedBySettings,
    createdAt: timestampToIsoOpt(app.createdAt),
  };
}
