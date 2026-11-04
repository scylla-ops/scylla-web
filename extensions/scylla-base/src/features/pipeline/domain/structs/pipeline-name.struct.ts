export type PipelineNameIssue = 'empty' | 'spaces';

/** The name goes into the breadcrumb and the URLs: it is a single word. */
export const pipelineNameIssue = (name: string): PipelineNameIssue | null => {
  const trimmed = name.trim();
  if (!trimmed) return 'empty';
  return /\s/.test(trimmed) ? 'spaces' : null;
};
