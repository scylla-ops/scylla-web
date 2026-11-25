import { createContext } from 'svelte';

/** What a node of the graph needs from the graph: xyflow hands a node only its own props. */
export interface JobGraphContext {
  /** Opens the log of the node. */
  select: (nodeId: string) => void;
  /** Whether the log of the node is open. */
  isSelected: (nodeId: string) => boolean;
}

export const [getJobGraph, setJobGraph] = createContext<JobGraphContext>();
