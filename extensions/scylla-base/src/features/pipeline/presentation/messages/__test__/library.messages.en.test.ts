// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { i18n } from '@lingui/core';
import { withLocale } from '@test/i18n.ts';
import { messages } from '@base/features/pipeline/locales/en/messages.ts';
import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';

withLocale('en', messages);

describe('library messages in English', () => {
  it('agrees the verbs with the count of pipelines that use a deleted fragment', () => {
    expect(i18n._(libraryMessages.deleteUsed(1))).toBe(
      '1 pipeline uses it: it keeps its nodes and still runs, but it no longer gets its versions. Its versions are lost.',
    );
    expect(i18n._(libraryMessages.deleteUsed(2))).toBe(
      '2 pipelines use it: they keep its nodes and still run, but they no longer get its versions. Its versions are lost.',
    );
  });
});
