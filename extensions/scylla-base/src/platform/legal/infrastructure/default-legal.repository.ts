import type { ILegalServiceClient } from '@base/generated/scylla/platform/v1/legal_service.client.ts';
import type { LegalRepository } from '../domain/repository/legal.repository.ts';
import type { LegalInfo, UpdateLegalSettingsInput } from '../domain/structs/legal-info.struct.ts';
import * as grpcLegal from './grpc-legal.mapper.ts';

export class DefaultLegalRepository implements LegalRepository {
  constructor(private readonly client: ILegalServiceClient) {}

  public async info(): Promise<LegalInfo> {
    const { info } = await this.client.getLegalInfo({}).response;
    return grpcLegal.toDomain(info);
  }

  public async update(input: UpdateLegalSettingsInput): Promise<LegalInfo> {
    const { info } = await this.client.updateLegalSettings(grpcLegal.updateToGrpc(input)).response;
    return grpcLegal.toDomain(info);
  }
}
