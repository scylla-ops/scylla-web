import type { OnboardingStatus } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';

export const isTourVisible = (status: OnboardingStatus, canStart: boolean): boolean =>
  status.kind === 'in-progress' || (status.kind === 'not-started' && canStart);

export const stepCount = (
  spotStepIds: readonly string[],
  stepId: string,
): { step: number; total: number } | null => {
  const index = spotStepIds.indexOf(stepId);
  return index === -1 ? null : { step: index + 1, total: spotStepIds.length };
};

/** No agent to wait for is not "offline": the step goes on as without the check. */
export const isAgentOffline = (
  agents: readonly { id: string; connected: boolean }[] | undefined,
  agentId: string | undefined,
): boolean => {
  if (!agents || agents.length === 0) return false;
  const watched = agentId ? agents.filter(agent => agent.id === agentId) : agents;
  if (watched.length === 0) return false;
  return !watched.some(agent => agent.connected);
};
