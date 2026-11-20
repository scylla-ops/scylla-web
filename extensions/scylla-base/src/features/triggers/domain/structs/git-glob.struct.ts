/** A glob of branches or of tags, for example `main` or `release/*`. */
export type GitGlob = string;

/** The server accepts at most 32 globs in one list. */
export const MAX_GLOBS = 32;

/** The longest glob that the server accepts, in characters. */
export const MAX_GLOB_LENGTH = 255;

export type GitGlobIssue = 'blank' | 'tooLong' | 'duplicate' | 'tooMany';

/** Why a glob cannot join a list, or `null`. The server checks the syntax. */
export const gitGlobIssue = (glob: GitGlob, list: readonly GitGlob[]): GitGlobIssue | null => {
  const value = glob.trim();
  if (value.length === 0) return 'blank';
  if ([...value].length > MAX_GLOB_LENGTH) return 'tooLong';
  if (list.includes(value)) return 'duplicate';
  if (list.length >= MAX_GLOBS) return 'tooMany';
  return null;
};
