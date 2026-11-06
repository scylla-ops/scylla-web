import type { MessageDescriptor } from '@lingui/core';
import { onboardingMessages as m } from '@base/features/onboarding/presentation/messages/onboarding.messages.ts';

export type IntroSlideKind = 'agents' | 'pipelines' | 'triggers' | 'jobs';

export interface IntroSlide {
  kind: IntroSlideKind;
  title: MessageDescriptor;
  body: MessageDescriptor;
  docs: MessageDescriptor;
}

/** The key features that the welcome dialog shows before it offers a tour. */
export const introSlides: readonly IntroSlide[] = [
  { kind: 'agents', title: m.agentsSlideTitle, body: m.agentsSlideBody, docs: m.agentsDocs },
  {
    kind: 'pipelines',
    title: m.pipelinesSlideTitle,
    body: m.pipelinesSlideBody,
    docs: m.pipelinesDocs,
  },
  {
    kind: 'triggers',
    title: m.triggersSlideTitle,
    body: m.triggersSlideBody,
    docs: m.triggersDocs,
  },
  { kind: 'jobs', title: m.jobsSlideTitle, body: m.jobsSlideBody, docs: m.jobsDocs },
];

/** The tours a user can start: those whose permissions they hold, the first one recommended. */
export const startableTours = <T extends { id: string; permissions: readonly P[] }, P>(
  tours: readonly T[],
  ids: readonly string[],
  can: (permission: P) => boolean,
): readonly T[] =>
  ids
    .map(id => tours.find(tour => tour.id === id))
    .filter((tour): tour is T => !!tour && tour.permissions.every(can));
