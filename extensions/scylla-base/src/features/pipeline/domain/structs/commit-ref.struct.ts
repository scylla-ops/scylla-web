/** A commit of the linked repository: the head of a branch, a tag, or a SHA. */
export type CommitRef =
  { kind: 'branch'; name: string } | { kind: 'tag'; name: string } | { kind: 'sha'; sha: string };

export type CommitShaIssue = 'empty' | 'not-hex' | 'length';

const HEX = /^[0-9a-f]+$/i;

/** The rule of the server: 7 to 40 hexadecimal characters, after trim. */
export const commitShaIssue = (text: string): CommitShaIssue | null => {
  const sha = text.trim();
  if (!sha) return 'empty';
  if (!HEX.test(sha)) return 'not-hex';
  return sha.length < 7 || sha.length > 40 ? 'length' : null;
};
