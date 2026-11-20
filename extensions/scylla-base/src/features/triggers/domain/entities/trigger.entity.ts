import type { CronExpression } from '../structs/cron-expression.struct.ts';

export interface CronSource {
  kind: 'cron';
  expression: CronExpression;
}

/**
 * The sender signs the body with HMAC-SHA256 and the secret of the trigger, in the header
 * `X-Scylla-Signature-256` or `X-Hub-Signature-256` (GitHub).
 */
export interface WebhookSource {
  kind: 'webhook';
  /** The address to post to. Derived by the server. Read-only. */
  webhookUrl: string;
}

/** An action on a pull request (a merge request on GitLab) that starts a run. */
export type PullRequestEvent = 'opened' | 'newCommits' | 'reopened' | 'readyForReview';

/** A push to a branch of the linked repository. An empty list of branches is each branch. */
export interface PushSource {
  kind: 'push';
  branches: string[];
  /** They win over `branches`. */
  excludeBranches: string[];
  /** Skips a commit with [skip ci] in its message. */
  skipCi: boolean;
}

/** A pull request into a target branch. No event is each event. */
export interface PullRequestSource {
  kind: 'pullRequest';
  branches: string[];
  events: PullRequestEvent[];
  /** Also runs the draft pull requests. */
  drafts: boolean;
}

/** A new tag of the linked repository. No pattern is each tag. */
export interface TagSource {
  kind: 'tag';
  patterns: string[];
}

/** The sources that need a linked repository. */
export type GitSource = PushSource | PullRequestSource | TagSource;

export type GitKind = GitSource['kind'];

/** A source arm this build does not know: rendered as it is, never edited, it cannot round-trip. */
export interface UnknownSource {
  kind: 'unknown';
}

export type TriggerSource = CronSource | WebhookSource | GitSource | UnknownSource;

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
  | { kind: 'webhook' }
  | GitSource;

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
  /** From the `on` table of a pipeline file: read only, change the file. */
  fromFile: boolean;
}

export const GIT_KINDS: readonly GitKind[] = ['push', 'pullRequest', 'tag'];

export const isGitSource = (source: TriggerSource | TriggerSourceDraft): source is GitSource =>
  (GIT_KINDS as readonly string[]).includes(source.kind);

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
