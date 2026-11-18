/** The busy job slots of one hour of the period. */
export interface SlotUsageBucket {
  start: string;
  /** The mean number of busy slots in the hour. */
  average: number;
  /** The largest number of busy slots at the same time in the hour. */
  peak: number;
}

/** The busy job slots of the agents of a workspace in a period (AgentService.GetSlotUsage). */
export interface SlotUsage {
  /** The slots of the agents that are connected now. */
  capacity: number;
  average: number;
  peak: number;
  /** Oldest first, also the hours with no job. */
  buckets: SlotUsageBucket[];
}
