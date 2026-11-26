/** A change in a workspace (ActivityService.ListActivity). The client makes the text. */
export interface ActivityEvent {
  id: string;
  /** `<subject>.<action>`, for example `job.ended`. The list is open. */
  kind: string;
  /** jobs, triggers, secrets, members, integrations or agents. */
  area: string;
  /** The user or the app of the change. Absent if the change has no actor. */
  actorId?: string;
  actorName: string;
  /** Empty for a change of the workspace. */
  projectId: string;
  projectName: string;
  subjectKind: string;
  subjectId: string;
  /** The parameters of the kind, as they were at the time of the change. */
  params: Readonly<Record<string, string>>;
  at: string;
}

export interface ActivityFeed {
  events: ActivityEvent[];
  /** The events at the last visit or later. At most 100. */
  sinceCount: number;
}
