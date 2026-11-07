import {
  blankCase,
  blankOperand,
  blankRule,
  portsOf,
  testHasRight,
  type Combinator,
  type Operand,
  type SwitchCase,
  type SwitchDefinition,
  type SwitchRule,
  type SwitchTest,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { uniqueNodeId } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import {
  ERROR_PORT,
  type PortName,
} from '@base/features/pipeline/domain/structs/port-name.struct.ts';

/** A port of the switch that an edit renamed, or removed (`to: null`): the needs on it follow. */
export interface PortChange {
  from: PortName;
  to: PortName | null;
}

/** A taken name gets a suffix, as a node id does. `from`: the own name of a renamed port. */
const freePort = (desired: string, ports: PortName[], from?: PortName): PortName =>
  uniqueNodeId(desired, new Set(ports), from);

/**
 * The new name of a port: an empty one, and `error`, which is the error port of a node that runs
 * a step, keep the old name; a taken one gets a suffix.
 */
const portAfterRename = (desired: string, from: PortName, ports: PortName[]): PortName => {
  const trimmed = desired.trim();
  return trimmed && trimmed !== ERROR_PORT ? freePort(trimmed, ports, from) : from;
};

/**
 * The cases, `otherwise` and `allMatches` of a switch, in the node draft. Each edit calls
 * `commit`; an edit that renames or removes a port says which, so that the needs on it follow.
 */
export const createSwitchDraft = (
  node: SwitchDefinition | undefined,
  commit: (port?: PortChange) => void,
) => {
  // `$state.raw`: replaced whole, so the value stays plain data.
  let cases = $state.raw<SwitchCase[]>(node?.cases ?? []);
  let otherwise = $state<PortName | undefined>(node?.otherwise);
  let allMatches = $state(node?.allMatches ?? false);

  const value = $derived<Omit<SwitchDefinition, 'env' | 'kind'>>({
    cases,
    ...(otherwise === undefined ? {} : { otherwise }),
    allMatches,
  });
  const ports = () => portsOf({ env: [], kind: 'switch', ...value });

  /** A port that goes takes its needs with it, unless another case still has it. */
  const commitRemoval = (from: PortName) => commit(ports().includes(from) ? undefined : { from, to: null });

  const setCase = (index: number, patch: Partial<SwitchCase>) => {
    cases = cases.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
  };

  const setRule = (index: number, ruleIndex: number, rule: SwitchRule) => {
    setCase(index, { rules: cases[index].rules.map((r, i) => (i === ruleIndex ? rule : r)) });
    commit();
  };

  return {
    get value() {
      return value;
    },
    get cases() {
      return cases;
    },
    get otherwise() {
      return otherwise;
    },
    get allMatches() {
      return allMatches;
    },
    set allMatches(next: boolean) {
      allMatches = next;
      commit();
    },

    addCase() {
      cases = [...cases, blankCase(freePort(`case-${cases.length + 1}`, ports()))];
      commit();
    },
    removeCase(index: number) {
      const { port } = cases[index];
      cases = cases.filter((_, i) => i !== index);
      commitRemoval(port);
    },
    /** The order matters: the first case that matches wins. */
    moveCase(index: number, by: -1 | 1) {
      const to = index + by;
      if (to < 0 || to >= cases.length) return;
      const next = [...cases];
      [next[index], next[to]] = [next[to], next[index]];
      cases = next;
      commit();
    },
    renameCase(index: number, desired: string) {
      const from = cases[index].port;
      const to = portAfterRename(desired, from, ports());
      if (to === from) return;
      setCase(index, { port: to });
      commit({ from, to });
    },
    setCombinator(index: number, combinator: Combinator) {
      setCase(index, { combinator });
      commit();
    },

    addRule(index: number) {
      setCase(index, { rules: [...cases[index].rules, blankRule()] });
      commit();
    },
    removeRule(index: number, ruleIndex: number) {
      setCase(index, { rules: cases[index].rules.filter((_, i) => i !== ruleIndex) });
      commit();
    },
    /** `empty` and `not_empty` have no right value; another test gets an empty text. */
    setTest(index: number, ruleIndex: number, test: SwitchTest) {
      const { left, right } = cases[index].rules[ruleIndex];
      const kept = right ?? blankOperand('literal');
      setRule(index, ruleIndex, { left, test, ...(testHasRight(test) ? { right: kept } : {}) });
    },
    setOperand(index: number, ruleIndex: number, side: 'left' | 'right', operand: Operand) {
      setRule(index, ruleIndex, { ...cases[index].rules[ruleIndex], [side]: operand });
    },

    /** On: a port for when no case matches. Off: it goes, with the needs on it. */
    setOtherwise(on: boolean) {
      if (on === (otherwise !== undefined)) return;
      const from = otherwise;
      otherwise = on ? freePort('otherwise', ports()) : undefined;
      if (from === undefined) commit();
      else commitRemoval(from);
    },
    renameOtherwise(desired: string) {
      if (otherwise === undefined) return;
      const from = otherwise;
      const to = portAfterRename(desired, from, ports());
      if (to === from) return;
      otherwise = to;
      commit({ from, to });
    },
  };
};

export type SwitchDraft = ReturnType<typeof createSwitchDraft>;
