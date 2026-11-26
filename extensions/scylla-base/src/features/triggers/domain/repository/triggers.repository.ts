import type {
  CreatedTrigger,
  TriggerDraft,
  TriggerEntity,
  WorkspaceTrigger,
  WorkspaceTriggerSearch,
} from '@base/features/triggers/domain/entities/trigger.entity.ts';

export interface TriggersRepository {
  listByPipelineId(pipelineId: string): Promise<TriggerEntity[]>;
  /**
   * One page of the triggers of a workspace that match the text, in the projects that the caller
   * sees. `signal` stops the call.
   */
  searchWorkspace(
    search: WorkspaceTriggerSearch,
    signal?: AbortSignal,
  ): Promise<WorkspaceTrigger[]>;
  getById(triggerId: string): Promise<TriggerEntity>;
  create(pipelineId: string, draft: TriggerDraft): Promise<CreatedTrigger>;
  update(triggerId: string, draft: TriggerDraft): Promise<TriggerEntity>;
  deleteById(triggerId: string): Promise<void>;
  setEnabled(triggerId: string, enabled: boolean): Promise<TriggerEntity>;
  /** Creates and dispatches a real job; returns its id. */
  fireNow(triggerId: string): Promise<string>;
}
