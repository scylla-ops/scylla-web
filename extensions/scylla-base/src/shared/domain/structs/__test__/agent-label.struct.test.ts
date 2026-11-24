// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { agentLabelIssue, MAX_AGENT_LABELS, sameAgentLabels } from '../agent-label.struct.ts';

describe('agentLabelIssue', () => {
  it('takes the labels of the rule of the server', () => {
    for (const label of ['deploy', 'x64', 'gpu.a100', 'eu-west_1', '9', 'a'.repeat(32)]) {
      expect(agentLabelIssue(label, [])).toBeNull();
    }
  });

  it('refuses a label with the wrong form', () => {
    for (const label of ['', 'Deploy', '-deploy', '.x', 'prod host', 'a'.repeat(33), 'été']) {
      expect(agentLabelIssue(label, [])).toBe('format');
    }
  });

  it('refuses a second copy and a label after the 16th', () => {
    const full = Array.from({ length: MAX_AGENT_LABELS }, (_, index) => `l${index}`);

    expect(agentLabelIssue('deploy', ['deploy'])).toBe('duplicate');
    expect(agentLabelIssue('more', full)).toBe('too-many');
    expect(agentLabelIssue('more', full.slice(1))).toBeNull();
  });
});

describe('sameAgentLabels', () => {
  it('compares the labels and their order', () => {
    expect(sameAgentLabels(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameAgentLabels(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(sameAgentLabels(['a'], ['a', 'b'])).toBe(false);
  });
});
