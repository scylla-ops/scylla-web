export type PipelineNameIssue = 'empty' | 'too-long' | 'not-one-line';

/** The longest name, in characters after trim: the same limit as `Name` of the server. */
export const PIPELINE_NAME_MAX_LENGTH = 100;

/** The rules of `Name` of the server: trimmed, one line, 1 to 100 characters. Spaces are fine. */
export const pipelineNameIssue = (name: string): PipelineNameIssue | null => {
  const trimmed = name.trim();
  if (!trimmed) return 'empty';
  if ([...trimmed].length > PIPELINE_NAME_MAX_LENGTH) return 'too-long';
  return /\p{Cc}/u.test(trimmed) ? 'not-one-line' : null;
};
