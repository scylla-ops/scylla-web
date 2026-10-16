// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createSecretLabelInput } from '../secret-label-input.state.svelte.ts';

describe('createSecretLabelInput', () => {
  it('follows the suggestion until the user edits the field', () => {
    let suggestion = 'build-runner';
    const input = createSecretLabelInput(() => suggestion);

    expect(input.value).toBe('build-runner');
    suggestion = 'build-runner-02';
    expect(input.value).toBe('build-runner-02');

    input.value = 'runner.local';
    suggestion = 'other';
    expect(input.value).toBe('runner.local');
  });

  it('shows no problem for a suggestion, only for a value that the user typed', () => {
    const input = createSecretLabelInput(() => '');

    expect(input.valid).toBe(false);
    expect(input.problem).toBeNull();

    input.value = 'a\tb';
    expect(input.problem).toBe('control');
    input.value = 'ci';
    expect(input.problem).toBeNull();
    expect(input.valid).toBe(true);
  });

  it('refuses a label that another secret holds', () => {
    const input = createSecretLabelInput(
      () => 'runner.local-2',
      () => ['runner.local'],
    );

    input.value = ' runner.local ';

    expect(input.problem).toBe('taken');
  });

  it('keeps a label that CE refused as taken until the value changes, and reset forgets it', () => {
    const input = createSecretLabelInput(() => 'runner.local');

    input.refuse('runner.local');
    expect(input.problem).toBe('taken');

    input.value = 'runner.local-2';
    expect(input.problem).toBeNull();

    input.reset();
    expect(input.value).toBe('runner.local');
    expect(input.problem).toBeNull();
    expect(input.valid).toBe(true);
  });

  it('compares a refused label after the CE trim: a leading U+0085 does not make it new', () => {
    const input = createSecretLabelInput(() => 'abc');

    input.refuse('abc');
    input.value = '\u0085abc';

    expect(input.problem).toBe('taken');
  });
});
