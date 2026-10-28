// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  SECRET_LABEL_MAX_BYTES,
  normalizeSecretLabel,
  secretLabelIssue,
  suggestSecretLabel,
  trimSecretLabel,
} from '../secret-label.struct.ts';

const suggest = (preferred: string, taken: string[] = [], fallback = 'build-runner-02') =>
  suggestSecretLabel({ preferred, fallback, taken });

describe('trimSecretLabel', () => {
  it('trims as Rust str::trim: U+0085 goes, U+FEFF stays', () => {
    expect(trimSecretLabel('\u0085abc\u3000')).toBe('abc');
    expect(trimSecretLabel('\ufeffabc')).toBe('\ufeffabc');
  });
});

describe('normalizeSecretLabel', () => {
  it('keeps a hostname as it is: dots and upper case are valid labels', () => {
    expect(normalizeSecretLabel('Build-01.example.com')).toBe('Build-01.example.com');
  });

  it('drops the control characters and trims', () => {
    expect(normalizeSecretLabel('  ci\tbot\u007f\n')).toBe('cibot');
  });

  it('cuts to 64 UTF-8 bytes, never inside a character', () => {
    expect(normalizeSecretLabel('a'.repeat(70))).toBe('a'.repeat(64));
    expect(normalizeSecretLabel(`${'a'.repeat(63)}é`)).toBe('a'.repeat(63));
    expect(normalizeSecretLabel(`${'a'.repeat(63)} b`)).toBe('a'.repeat(63));
  });
});

describe('secretLabelIssue', () => {
  it('accepts what CE accepts, once trimmed', () => {
    expect(secretLabelIssue(' runner.local ')).toBeNull();
    expect(secretLabelIssue('é'.repeat(32))).toBeNull();
  });

  it('accepts U+0085 at the edge, which CE trims, and U+FEFF, which is not a control character', () => {
    expect(secretLabelIssue('\u0085abc')).toBeNull();
    expect(normalizeSecretLabel('\u0085abc')).toBe('abc');
    expect(secretLabelIssue('\ufeffabc')).toBeNull();
    expect(normalizeSecretLabel('\ufeffabc')).toBe('\ufeffabc');
  });

  it('compares a taken label after the CE trim', () => {
    expect(secretLabelIssue('\u0085runner.local', ['runner.local'])).toBe('taken');
  });

  it('names the CE rule that a label breaks', () => {
    expect(secretLabelIssue('   ')).toBe('empty');
    expect(secretLabelIssue('a\tb')).toBe('control');
    expect(secretLabelIssue('a'.repeat(SECRET_LABEL_MAX_BYTES + 1))).toBe('tooLong');
    expect(secretLabelIssue('é'.repeat(33))).toBe('tooLong');
  });

  it('refuses a label that another secret of the app has, with the same case', () => {
    expect(secretLabelIssue('runner.local ', ['runner.local'])).toBe('taken');
    expect(secretLabelIssue('Runner.local', ['runner.local'])).toBeNull();
  });
});

describe('suggestSecretLabel', () => {
  it('suggests the hostname as it is', () => {
    expect(suggest('runner.local')).toBe('runner.local');
  });

  it('suggests the agent name when there is no host or nothing valid is left of it', () => {
    expect(suggest('')).toBe('build-runner-02');
    expect(suggest('\t\n')).toBe('build-runner-02');
  });

  it('adds the first free suffix while the label is taken: a label is unique per app', () => {
    expect(suggest('runner.local', ['runner.local'])).toBe('runner.local-2');
    expect(suggest('runner.local', ['runner.local', 'runner.local-2', 'runner.local-3'])).toBe(
      'runner.local-4',
    );
  });

  it('cuts a long name to leave space for the suffix', () => {
    const long = 'h'.repeat(80);

    expect(suggest(long)).toBe('h'.repeat(64));
    expect(suggest(long, ['h'.repeat(64)])).toBe(`${'h'.repeat(62)}-2`);
  });

  it('suggests nothing while both values are empty', () => {
    expect(suggest('', [], '')).toBe('');
  });
});
