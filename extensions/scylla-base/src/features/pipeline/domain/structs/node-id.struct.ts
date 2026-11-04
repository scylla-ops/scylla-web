/** The id of a node: unique in its pipeline, and what the other nodes wait for. */
export type NodeId = string;

export type NodeIdIssue =
  | { kind: 'empty' }
  | { kind: 'invalid-characters'; characters: string[] }
  | { kind: 'too-long'; length: number };

/** The server's rule (`NodeIdRule` in scylla-domain): trimmed, 1 to 128 of `a-z`, `0-9`, `-`, `_`. */
export const NODE_ID_MAX_LENGTH = 128;

export const nodeIdIssue = (raw: string): NodeIdIssue | null => {
  const id = raw.trim();
  if (!id) return { kind: 'empty' };

  const characters = [...new Set([...id].filter(character => !/[a-z0-9_-]/.test(character)))];
  if (characters.length) return { kind: 'invalid-characters', characters };

  // Only ASCII is left: a character is a byte.
  return id.length > NODE_ID_MAX_LENGTH ? { kind: 'too-long', length: id.length } : null;
};

/** The nearest valid id: lowercase, accents dropped, any other run of characters a `-`. */
export const toNodeId = (raw: string): NodeId =>
  raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, NODE_ID_MAX_LENGTH) || 'node';
