import { nodeIdIssue, type NodeIdIssue } from './node-id.struct.ts';

/** An output of a node that a need can name: a port of a switch, or `error` on a node that runs a step. */
export type PortName = string;

/** The port of a node that runs a step: it opens when the node failed after its last attempt. */
export const ERROR_PORT: PortName = 'error';

export type PortNameIssue = NodeIdIssue;

/** The rule of `NodeId` (`PortName` in scylla-domain), with no trim: the server reads the name as it is. */
export const portNameIssue = (raw: string): PortNameIssue | null =>
  nodeIdIssue(raw) ??
  (raw.trim() === raw ? null : { kind: 'invalid-characters', characters: [' '] });
