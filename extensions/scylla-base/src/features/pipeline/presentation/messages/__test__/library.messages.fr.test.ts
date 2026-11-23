// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { i18n } from '@lingui/core';
import { withLocale } from '@test/i18n.ts';
import { messages } from '@base/features/pipeline/locales/fr/messages.ts';
import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';

withLocale('fr', messages);

describe('library messages in French', () => {
  it('agrees the title of the library with the count of fragments', () => {
    expect(i18n._(libraryMessages.fragments(1))).toBe('fragment');
    expect(i18n._(libraryMessages.fragments(3))).toBe('fragments');
    expect(i18n._(communityMessages.communityFragments(1))).toBe('fragment de la communauté');
    expect(i18n._(communityMessages.communityFragments(3))).toBe('fragments de la communauté');
  });

  it('agrees the pipelines that lose the versions of a deleted fragment', () => {
    expect(i18n._(libraryMessages.deleteUsed(1))).toBe(
      "1 pipeline l'utilise\u00a0: elle garde ses nœuds et s'exécute toujours, mais ne reçoit plus ses versions. Ses versions sont perdues.",
    );
    expect(i18n._(libraryMessages.deleteUsed(2))).toBe(
      "2 pipelines l'utilisent\u00a0: elles gardent ses nœuds et s'exécutent toujours, mais ne reçoivent plus ses versions. Ses versions sont perdues.",
    );
  });

  it('agrees a count that the English message does not put in the plural', () => {
    expect(i18n._(communityMessages.canSwitch(1, 4))).toBe(
      '1 pipeline sur 4 peut passer telle quelle.',
    );
    expect(i18n._(communityMessages.canSwitch(3, 4))).toBe(
      '3 pipelines sur 4 peuvent passer telles quelles.',
    );
  });

  it('says that no pipeline was found in the feminine', () => {
    expect(i18n._(pipelineMessages.noPipelines)).toBe('Aucune pipeline trouvée');
  });
});
