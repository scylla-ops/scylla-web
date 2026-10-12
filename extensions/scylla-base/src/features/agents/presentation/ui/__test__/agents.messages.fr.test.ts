// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { i18n } from '@lingui/core';
import { withLocale } from '@test/i18n.ts';
import { messages } from '@base/features/agents/locales/fr/messages.ts';
import { agentsMessages } from '../agents.messages.ts';
import { agentsPageMessages } from '../Agents/agents-page.messages.ts';
import { agentDetailsMessages } from '../AgentDetails/agent-details.messages.ts';
import { resetSecretMessages } from '../components/ResetSecretDialog/reset-secret.messages.ts';

/** The plural arms and the placeholders: a renamed placeholder loses the French form. */
withLocale('fr', messages);

describe('agents messages in French', () => {
  it('says how many agents run a job, with its own form for none', () => {
    expect(i18n._(agentsPageMessages.agentsRunning(0))).toBe("Aucun agent n'exécute de job");
    expect(i18n._(agentsPageMessages.agentsRunning(1))).toBe('1 exécute un job');
    expect(i18n._(agentsPageMessages.agentsRunning(3))).toBe('3 exécutent un job');
  });

  it('puts the count of running jobs first', () => {
    expect(i18n._(agentsMessages.stateRunning(1))).toBe('1 job en cours');
    expect(i18n._(agentsMessages.stateRunning(2))).toBe('2 jobs en cours');
  });

  it('agrees the outcome words of the all-time line with their count', () => {
    expect(i18n._(agentDetailsMessages.allTimeCompleted(1))).toBe('terminé');
    expect(i18n._(agentDetailsMessages.allTimeCompleted(61))).toBe('terminés');
    expect(i18n._(agentDetailsMessages.allTimeOrphaned(2))).toBe('orphelins');
  });

  it('writes the units of memory the French way', () => {
    expect(i18n._(agentsMessages.memoryGb(8))).toBe('8 Go');
  });

  it('quotes the label of a kept secret with guillemets', () => {
    expect(i18n._(resetSecretMessages.keptOne('default'))).toBe(
      "L'ancien secret « default » reste activé.",
    );
  });
});
