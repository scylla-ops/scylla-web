// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { i18n } from '@lingui/core';
import { messages } from '@base/features/jobs/locales/fr/messages.ts';
import { jobsMessages } from '../jobs.messages.ts';

i18n.load('fr', messages);

afterEach(() => i18n.activate('en'));

describe('the reason of a job that waits for labels', () => {
  it('says "label" for one label and "labels" for more, in English', () => {
    expect(i18n._(jobsMessages.noAgentWithLabels(1, 'gpu'))).toBe(
      'Waiting for an agent with the label gpu',
    );
    expect(i18n._(jobsMessages.noAgentWithLabels(2, 'gpu, arm64'))).toBe(
      'Waiting for an agent with the labels gpu, arm64',
    );
  });

  it('says it in French', () => {
    i18n.activate('fr');

    expect(i18n._(jobsMessages.noAgentWithLabels(1, 'gpu'))).toBe(
      "En attente d'un agent avec l'étiquette gpu",
    );
    expect(i18n._(jobsMessages.noAgentWithLabels(2, 'gpu, arm64'))).toBe(
      "En attente d'un agent avec les étiquettes gpu, arm64",
    );
  });
});
