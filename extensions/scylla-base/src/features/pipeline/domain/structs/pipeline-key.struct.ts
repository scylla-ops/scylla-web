/** The longest key: `MAX_KEY` of the server. */
export const PIPELINE_KEY_MAX_LENGTH = 64;

/** The key of a name with no letter and no digit. */
const FALLBACK_KEY = 'pipeline';

/** A pipeline file of the default branch, and the key that names its check `scylla/<key>`. */
export interface PipelineFileKey {
  key: string;
  /** For example `.scylla/pipelines/build.yaml`. */
  path: string;
}

/**
 * The key of the name of an editor pipeline, as `pipeline_key` of the server: the ASCII letters in
 * lower case, the digits, and one dash for each run of other characters, cut to 64. The accents
 * go; the server also writes the other letters in ASCII, so it stays the judge.
 */
export const pipelineKey = (name: string): string => {
  const ascii = name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  let key = '';
  for (const char of ascii) {
    if (/^[a-z0-9]$/.test(char)) key += char;
    else if (key && !key.endsWith('-')) key += '-';
  }
  return key.slice(0, PIPELINE_KEY_MAX_LENGTH).replace(/-+$/, '') || FALLBACK_KEY;
};

/**
 * The file whose key a name of an editor pipeline takes, or `null`: the file wins, and the server
 * refuses the name (`PIPELINE_KEY_TAKEN`). A rename that keeps the key of the saved name is free:
 * the server checks only a new key.
 */
export const fileWithKeyOf = (
  name: string,
  files: readonly PipelineFileKey[],
  savedName?: string,
): PipelineFileKey | null => {
  const key = pipelineKey(name);
  if (savedName !== undefined && pipelineKey(savedName) === key) return null;
  return files.find(file => file.key === key) ?? null;
};

/** The key of a pipeline file: the name of the file with no extension (`pipeline` for `.scylla/pipeline.toml`). */
export const fileKeyOf = (path: string): string => {
  const file = path.slice(path.lastIndexOf('/') + 1);
  const dot = file.indexOf('.');
  return dot > 0 ? file.slice(0, dot) : file;
};
