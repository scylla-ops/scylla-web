import type { NodeDefinition } from '../entities/pipeline-node.entity.ts';

/** A ready-made node that the editor offers. Built in today; the backend can serve them later. */
export interface NodeTemplate {
  id: string;
  /** Shown as is: a tool name such as `npm ci` reads the same in every language. */
  name: string;
  /** The id the new node proposes; the canvas makes it unique. */
  nodeId: string;
  /** A hint for the icon. An unknown value falls back to the icon of the node's kind. */
  icon?: string;
  definition: NodeDefinition;
}
