import type { CronExpression } from '../structs/cron-expression.struct.ts';

export interface CronSource {
  kind: 'cron';
  expression: CronExpression;
}

export interface WebhookSource {
  kind: 'webhook';
  /** Empty: the default Scylla header. */
  signatureHeader: string;
  /** Derived by the server. Read-only. */
  webhookUrl: string;
}

/** A source arm this build does not know: rendered as it is, never edited, it cannot round-trip. */
export interface UnknownSource {
  kind: 'unknown';
}

export type TriggerSource = CronSource | WebhookSource | UnknownSource;

export type TriggerKind = TriggerSource['kind'];

/** A constant, or a value extracted from the webhook payload. */
export type TriggerInputValue =
  | { kind: 'literal'; value: string }
  | { kind: 'jsonPointer'; value: string };

/**
 * A value that the trigger gives to the run of its pipeline. "Input" is the word of the product
 * and of the protos: this is not the input of a repository call.
 */
export interface TriggerInput {
  key: string;
  value: TriggerInputValue;
}

/** Without the read-only `webhookUrl`. */
export type TriggerSourceDraft =
  | { kind: 'cron'; expression: CronExpression }
  | { kind: 'webhook'; signatureHeader: string };

export type TriggerDraftKind = TriggerSourceDraft['kind'];

/** `unknown`: an outcome arm newer than this build. */
export type TriggerFireResult =
  | { kind: 'succeeded' }
  | { kind: 'failed'; error: string }
  | { kind: 'unknown' };

/** Launches a run of its pipeline without a human. */
export interface TriggerEntity {
  id: string;
  pipelineId: string;
  name: string;
  source: TriggerSource;
  inputs: TriggerInput[];
  enabled: boolean;
  /** Cron only, UTC. */
  nextFireAt?: string;
  lastFiredAt?: string;
  lastResult?: TriggerFireResult;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerDraft {
  name: string;
  source: TriggerSourceDraft;
  inputs: TriggerInput[];
}

/** Returned only by create. The webhook secret is shown once and never returned again. */
export interface CreatedTrigger {
  trigger: TriggerEntity;
  webhookSecret?: string;
}
