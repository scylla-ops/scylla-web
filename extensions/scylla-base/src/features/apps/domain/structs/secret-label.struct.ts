/** The rules of `AppSecretLabel` in CE: trimmed, 1 to 64 UTF-8 bytes, no control character. */
export const SECRET_LABEL_MAX_BYTES = 64;

/** `taken`: another secret of the app has the label. CE says `ALREADY_EXISTS`. */
export type SecretLabelProblem = 'empty' | 'tooLong' | 'control' | 'taken';

const CONTROL = /\p{Cc}/u;
const CONTROLS = /\p{Cc}/gu;
const EDGE_SPACE = /^\p{White_Space}+|\p{White_Space}+$/gu;
const encoder = new TextEncoder();

/** Rust `str::trim`, as CE: the Unicode White_Space property. It strips U+0085, not U+FEFF. */
export const trimSecretLabel = (value: string): string => value.replace(EDGE_SPACE, '');

const byteLength = (value: string): number => encoder.encode(value).length;

const cutToBytes = (value: string, maxBytes: number): string => {
  let kept = '';
  let used = 0;
  for (const char of value) {
    used += byteLength(char);
    if (used > maxBytes) break;
    kept += char;
  }
  return kept;
};

/** What CE keeps of a raw value: no control character, trimmed, cut to `maxBytes`. */
export const normalizeSecretLabel = (raw: string, maxBytes = SECRET_LABEL_MAX_BYTES): string =>
  trimSecretLabel(cutToBytes(trimSecretLabel(raw.replace(CONTROLS, '')), maxBytes));

/** `null` when CE accepts the label and no label of `taken` is the same. */
export const secretLabelProblem = (
  label: string,
  taken: readonly string[] = [],
): SecretLabelProblem | null => {
  const value = trimSecretLabel(label);
  if (value === '') return 'empty';
  if (CONTROL.test(value)) return 'control';
  if (byteLength(value) > SECRET_LABEL_MAX_BYTES) return 'tooLong';
  if (taken.includes(value)) return 'taken';
  return null;
};

/**
 * The label to suggest for a new secret: `preferred` (a hostname), else `fallback` (the agent
 * name), normalized. While another secret of the app has it: `-2`, `-3`… cut to stay in 64 bytes.
 * Empty when both give nothing.
 */
export const suggestSecretLabel = ({
  preferred,
  fallback,
  taken,
}: {
  preferred: string;
  fallback: string;
  taken: readonly string[];
}): string => {
  const base = normalizeSecretLabel(preferred) || normalizeSecretLabel(fallback);
  const used = new Set(taken);
  if (base === '' || !used.has(base)) return base;

  for (let suffix = 2; ; suffix += 1) {
    const end = `-${suffix}`;
    const candidate = `${normalizeSecretLabel(base, SECRET_LABEL_MAX_BYTES - end.length)}${end}`;
    if (!used.has(candidate)) return candidate;
  }
};
