/** Why an item needs a person. */
export type AttentionKind =
  | 'job-failed'
  | 'job-orphaned'
  | 'fire-failed'
  | 'fire-missed'
  | 'agent-offline'
  | 'approval-waiting';

/** An open item of "Needs you". It goes away by itself when its cause is fixed. */
export interface AttentionItem {
  kind: AttentionKind;
  /** The end of the job, the due time of the fire, or the last seen time of the agent. */
  at: string;
  /** After the last visit of the person. */
  isNew: boolean;
  /** The open items of the same subject and kind that this item stands for: 1 or more. */
  count: number;
  /** Empty for an agent. */
  projectId: string;
  projectName: string;
  pipelineId: string;
  pipelineName: string;
  job?: { id: string; error: string; branch: string; agentName: string; nodeId: string; nodeError: string };
  fire?: { id: string; triggerId: string; triggerName: string; schedule: string; error: string };
  agent?: { id: string; name: string; lastSeenAt: string };
}

/** The open items of a workspace, the newest first, and their counts. */
export interface AttentionList {
  items: AttentionItem[];
  openCount: number;
  newCount: number;
  counts: { kind: AttentionKind; open: number }[];
}

/** What to read: one project or all, and the last visit for `isNew`. */
export interface AttentionQuery {
  workspaceId: string;
  projectIds: string[];
  since: string | null;
  limit: number;
}
