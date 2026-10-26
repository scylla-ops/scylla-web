export enum TriggerKind {
  Cron = 'cron',
  Webhook = 'webhook',
  /** A source arm this build does not know. Read-only. */
  Unknown = 'unknown',
}

/** 5 fields, evaluated in UTC. */
export interface CronSource {
  kind: TriggerKind.Cron;
  expression: string;
}

export interface WebhookSource {
  kind: TriggerKind.Webhook;
  /** Empty: the default Scylla header. */
  signatureHeader: string;
  /** Derived by the server. Read-only. */
  webhookUrl: string;
}

/** Rendered as it is, never edited: it cannot round-trip. */
export interface UnknownSource {
  kind: TriggerKind.Unknown;
}

export type TriggerSource = CronSource | WebhookSource | UnknownSource;

/** A constant, or a value extracted from the webhook payload. */
export type TriggerInputValue =
  | { kind: 'literal'; value: string }
  | { kind: 'jsonPointer'; value: string };

export interface TriggerInput {
  key: string;
  value: TriggerInputValue;
}

/** Without the read-only `webhookUrl`. */
export type TriggerSourceDraft =
  | { kind: TriggerKind.Cron; expression: string }
  | { kind: TriggerKind.Webhook; signatureHeader: string };

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
