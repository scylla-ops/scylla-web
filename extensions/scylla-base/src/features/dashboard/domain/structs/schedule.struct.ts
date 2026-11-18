import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';

/** `error`: the fire ran and made no job ("fire failed"). `missed`: the server was down ("time missed"). */
export type FireState = 'ok' | 'error' | 'missed' | 'none';

/** A cron trigger and its fires of the next hours (TriggerService.ListWorkspaceTriggers). */
export interface ScheduleTrigger {
  id: string;
  name: string;
  pipelineId: string;
  pipelineName: string;
  projectId: string;
  projectName: string;
  /** Oldest first. */
  upcoming: string[];
  /** The state of the newest fire. */
  lastState: FireState;
  failedFires: number;
  missedTimes: number;
}

/** A fire or a missed time of a cron trigger (TriggerService.ListTriggerFires). */
export interface ScheduleFire {
  id: string;
  triggerId: string;
  triggerName: string;
  pipelineId: string;
  projectId: string;
  /** The time of the fire, or the cron time that the server missed. */
  at: string;
  state: FireState;
  error: string;
  /** Empty when the fire made no job. */
  jobId: string;
  jobStatus: JobStatus;
}

export interface Schedules {
  triggers: ScheduleTrigger[];
  fires: ScheduleFire[];
}
