import { createContext } from 'svelte';

/** What a node of the graph needs from the graph: xyflow hands a node only its own props. */
export interface JobGraphContext {
  /** Opens the logs of the node in the list. */
  select: (nodeId: string) => void;
}

export const [getJobGraph, setJobGraph] = createContext<JobGraphContext>();
