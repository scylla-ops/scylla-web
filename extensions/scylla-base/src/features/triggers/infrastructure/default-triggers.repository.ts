import type {
  CreatedTrigger,
  TriggerDraft,
  TriggerEntity,
} from '@base/features/triggers/domain/entities/trigger.entity.ts';
import type { TriggersRepository } from '@base/features/triggers/domain/repository/triggers.repository.ts';
import type { ITriggerServiceClient } from '@base/generated/scylla/trigger/v1/trigger.client.ts';
import type { Trigger } from '@base/generated/scylla/trigger/v1/trigger.ts';
import { idValue, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcTrigger from './grpc-trigger.mapper.ts';

const requireTrigger = (trigger: Trigger | undefined, rpc: string): TriggerEntity => {
  if (!trigger) throw new Error(`${rpc} returned no trigger`);
  return grpcTrigger.toDomain(trigger);
};

export class DefaultTriggersRepository implements TriggersRepository {
  constructor(private readonly client: ITriggerServiceClient) {}

  public async listByPipelineId(pipelineId: string): Promise<TriggerEntity[]> {
    const response = await this.client.listPipelineTriggers({ pipelineId: wrapId(pipelineId) })
      .response;
    return grpcTrigger.toDomainList(response.triggers);
  }

  public async getById(triggerId: string): Promise<TriggerEntity> {
    const response = await this.client.getTrigger({ triggerId: wrapId(triggerId) }).response;
    return requireTrigger(response.trigger, 'GetTrigger');
  }

  public async create(pipelineId: string, draft: TriggerDraft): Promise<CreatedTrigger> {
    const response = await this.client.createTrigger(
      grpcTrigger.draftToCreateRequest(pipelineId, draft),
    ).response;
    return grpcTrigger.createdToDomain(response);
  }

  public async update(triggerId: string, draft: TriggerDraft): Promise<TriggerEntity> {
    const response = await this.client.updateTrigger(
      grpcTrigger.draftToUpdateRequest(triggerId, draft),
    ).response;
    return requireTrigger(response.trigger, 'UpdateTrigger');
  }

  public async deleteById(triggerId: string): Promise<void> {
    await this.client.deleteTrigger({ triggerId: wrapId(triggerId) }).response;
  }

  public async setEnabled(triggerId: string, enabled: boolean): Promise<TriggerEntity> {
    const response = await this.client.setTriggerEnabled({
      triggerId: wrapId(triggerId),
      enabled,
    }).response;
    return requireTrigger(response.trigger, 'SetTriggerEnabled');
  }

  /** Gives only the id of the job it created. */
  public async fireNow(triggerId: string): Promise<string> {
    const response = await this.client.fireTriggerNow({ triggerId: wrapId(triggerId) }).response;
    return idValue(response.jobId);
  }
}
