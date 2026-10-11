import type {
  CreatedTrigger,
  TriggerDraft,
  TriggerEntity,
} from '@base/features/triggers/domain/entities/trigger.entity.ts';
import type { TriggersRepository } from '@base/features/triggers/domain/repository/triggers.repository.ts';
import type { ITriggerServiceClient } from '@base/generated/scylla/trigger/v1/trigger.client.ts';
import type { Trigger } from '@base/generated/scylla/trigger/v1/trigger.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import { idValue, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import { GrpcTriggerMapper } from './grpc-trigger.mapper.ts';

const requireTrigger = (trigger: Trigger | undefined, rpc: string): TriggerEntity => {
  if (!trigger) throw new ScyllaError(`${rpc} returned no trigger`);
  return GrpcTriggerMapper.toDomain(trigger);
};

export class DefaultTriggersRepository implements TriggersRepository {
  constructor(private readonly client: ITriggerServiceClient) {}

  public listByPipelineId(pipelineId: string): Promise<ScyllaResult<TriggerEntity[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listPipelineTriggers({ pipelineId: wrapId(pipelineId) })
        .response;
      return GrpcTriggerMapper.toDomainList(response.triggers);
    }, 'Error listing triggers');
  }

  public getById(triggerId: string): Promise<ScyllaResult<TriggerEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.getTrigger({ triggerId: wrapId(triggerId) }).response;
      return requireTrigger(response.trigger, 'GetTrigger');
    }, 'Error fetching trigger');
  }

  public create(pipelineId: string, draft: TriggerDraft): Promise<ScyllaResult<CreatedTrigger>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.createTrigger(
        GrpcTriggerMapper.draftToCreateRequest(pipelineId, draft),
      ).response;
      return GrpcTriggerMapper.createdToDomain(response);
    }, 'Failed to create trigger');
  }

  public update(triggerId: string, draft: TriggerDraft): Promise<ScyllaResult<TriggerEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.updateTrigger(
        GrpcTriggerMapper.draftToUpdateRequest(triggerId, draft),
      ).response;
      return requireTrigger(response.trigger, 'UpdateTrigger');
    }, 'Failed to update trigger');
  }

  public deleteById(triggerId: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.deleteTrigger({ triggerId: wrapId(triggerId) }).response;
    }, 'Error deleting trigger');
  }

  public setEnabled(triggerId: string, enabled: boolean): Promise<ScyllaResult<TriggerEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.setTriggerEnabled({
        triggerId: wrapId(triggerId),
        enabled,
      }).response;
      return requireTrigger(response.trigger, 'SetTriggerEnabled');
    }, 'Failed to update trigger');
  }

  /** Gives only the id of the job it created. */
  public fireNow(triggerId: string): Promise<ScyllaResult<string>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.fireTriggerNow({ triggerId: wrapId(triggerId) }).response;
      return idValue(response.jobId);
    }, 'Failed to fire trigger');
  }
}
