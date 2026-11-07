import type { PipelineMetadata, PipelineEntity } from '../domain/entities/pipeline.entity.ts';
import {
  NUMBER_TESTS,
  TEXT_TESTS,
  type Dependency,
  type EnvEntry,
  type Operand as NodeOperand,
  type Shell as NodeShell,
  type PipelineNodeEntity,
  type SwitchDefinition,
  type SwitchTest,
} from '../domain/entities/pipeline-node.entity.ts';
import type { PipelineLayout } from '../domain/structs/pipeline-layout.struct.ts';
import type {
  EnvVar,
  Need,
  Node,
  Operand,
  Pipeline,
  PipelineLayout as GrpcPipelineLayout,
  Switch,
} from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import { Combinator, Shell, Test } from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import type { PaginatedList, PaginationParams } from '@scylla/ui/structs';
import { idValue, required, timestampToIso } from '@shared/infrastructure/grpc/wrappers.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';

function shellFromProto(s: Shell): NodeShell {
  return s === Shell.BASH ? 'bash' : 'sh';
}

function shellToProto(s: NodeShell): Shell {
  return s === 'bash' ? Shell.BASH : Shell.SH;
}

/** A oneof arm this build does not know: refuse the pipeline, or saving it would erase the arm on the server. */
class UnknownArmError extends ScyllaError {
  constructor(what: string) {
    super(`${what} uses a variant this client doesn't understand — update Scylla`, {
      code: 'UNSUPPORTED_RESPONSE',
      raw: true,
    });
  }
}

function envVarToDomain(e: EnvVar): EnvEntry {
  switch (e.value.oneofKind) {
    case 'secret':
      return { key: e.name, kind: 'secret', secretRef: e.value.secret };
    case 'literal':
      return { key: e.name, kind: 'literal', value: e.value.literal };
    default:
      throw new UnknownArmError(`Environment variable "${e.name}"`);
  }
}

function envVarFromDomain(entry: EnvEntry): EnvVar {
  if (entry.kind === 'secret') {
    return { name: entry.key, value: { oneofKind: 'secret', secret: entry.secretRef } };
  }
  return { name: entry.key, value: { oneofKind: 'literal', literal: entry.value } };
}

function needToDomain({ node, port }: Need): Dependency {
  return port ? { node, port } : { node };
}

const SWITCH_TESTS: readonly string[] = [...TEXT_TESTS, ...NUMBER_TESTS];

/** `TEST_NUMBER_GT` is `number_gt`. */
function testToDomain(test: Test, node: string): SwitchTest {
  const name = Test[test]?.toLowerCase();
  if (name && SWITCH_TESTS.includes(name)) return name as SwitchTest;
  throw new UnknownArmError(`The switch "${node}"`);
}

function operandToDomain({ value }: Operand, node: string): NodeOperand {
  switch (value.oneofKind) {
    case 'literal':
      return { kind: 'literal', value: value.literal };
    case 'var':
      return { kind: 'var', name: value.var };
    case 'output':
      return { kind: 'output', node: value.output.node, key: value.output.key };
    default:
      throw new UnknownArmError(`The switch "${node}"`);
  }
}

function operandFromDomain(operand: NodeOperand): Operand {
  switch (operand.kind) {
    case 'literal':
      return { value: { oneofKind: 'literal', literal: operand.value } };
    case 'var':
      return { value: { oneofKind: 'var', var: operand.name } };
    case 'output':
      return {
        value: { oneofKind: 'output', output: { node: operand.node, key: operand.key } },
      };
  }
}

/** `UNSPECIFIED` is `all`, as the server reads it. */
function combinatorToDomain(combinator: Combinator, node: string): 'all' | 'any' {
  if (combinator === Combinator.ANY) return 'any';
  if (combinator === Combinator.ALL || combinator === Combinator.UNSPECIFIED) return 'all';
  throw new UnknownArmError(`The switch "${node}"`);
}

/** The cases, `otherwise` and `allMatches` of a switch node. */
function switchToDomain(step: Switch, node: string): Omit<SwitchDefinition, 'env' | 'kind'> {
  return {
    cases: step.cases.map(({ port, combinator, rules }) => ({
      port,
      combinator: combinatorToDomain(combinator, node),
      rules: rules.map(rule => ({
        left: operandToDomain(required(rule.left, 'left'), node),
        test: testToDomain(rule.test, node),
        // A right value with no operand is no right value, as the server reads it.
        ...(rule.right?.value.oneofKind ? { right: operandToDomain(rule.right, node) } : {}),
      })),
    })),
    ...(step.otherwise ? { otherwise: step.otherwise } : {}),
    allMatches: step.allMatches,
  };
}

function switchFromDomain(node: SwitchDefinition): Switch {
  return {
    cases: node.cases.map(({ port, combinator, rules }) => ({
      port,
      combinator: combinator === 'any' ? Combinator.ANY : Combinator.ALL,
      rules: rules.map(rule => ({
        left: operandFromDomain(rule.left),
        test: Test[rule.test.toUpperCase() as Uppercase<SwitchTest>],
        ...(rule.right ? { right: operandFromDomain(rule.right) } : {}),
      })),
    })),
    otherwise: node.otherwise ?? '',
    allMatches: node.allMatches,
  };
}

/** A node of a pipeline, or of the snapshot of a job. */
export function nodeToDomain(node: Node): PipelineNodeEntity {
  const id = node.id;
  const deps = node.needs.map(needToDomain);
  const step = node.step;
  if (step.oneofKind === 'switch')
    return {
      id,
      deps,
      env: node.env.map(envVarToDomain),
      kind: 'switch',
      ...switchToDomain(step.switch, id),
    };
  if (step.oneofKind === 'merge') return { id, deps, kind: 'merge' };

  const base = {
    id,
    deps,
    ...(node.workingDir ? { workingDir: node.workingDir } : {}),
    env: node.env.map(envVarToDomain),
    // 0 is the default of the server: one hour.
    ...(node.timeoutSeconds ? { timeoutSeconds: node.timeoutSeconds } : {}),
    ...(node.retries ? { retries: node.retries } : {}),
    ...(node.container?.image ? { image: node.container.image } : {}),
  };

  if (step.oneofKind === 'script') {
    return {
      ...base,
      kind: 'script',
      script: step.script.source,
      shell: shellFromProto(step.script.shell),
    };
  }
  if (step.oneofKind === 'exec') {
    const [command = '', ...args] = step.exec.argv;
    return { ...base, kind: 'exec', command, args };
  }
  throw new UnknownArmError(`Node "${base.id}"`);
}

/** A switch and a merge have no process: no folder, no limit, no container. */
export function nodeFromDomain(node: PipelineNodeEntity): Node {
  const needs = node.deps.map(({ node, port }) => ({ node, port: port ?? '' }));
  if (node.kind === 'switch' || node.kind === 'merge')
    return {
      id: node.id,
      needs,
      workingDir: '',
      env: node.kind === 'switch' ? node.env.map(envVarFromDomain) : [],
      timeoutSeconds: 0,
      retries: 0,
      step:
        node.kind === 'switch'
          ? { oneofKind: 'switch', switch: switchFromDomain(node) }
          : { oneofKind: 'merge', merge: {} },
    };

  return {
    id: node.id,
    needs,
    workingDir: node.workingDir ?? '',
    env: node.env.map(envVarFromDomain),
    timeoutSeconds: node.timeoutSeconds ?? 0,
    retries: node.retries ?? 0,
    ...(node.image ? { container: { image: node.image } } : {}),
    step:
      node.kind === 'script'
        ? { oneofKind: 'script', script: { source: node.script, shell: shellToProto(node.shell) } }
        : { oneofKind: 'exec', exec: { argv: [node.command, ...node.args] } },
  };
}

export const layoutToDomain = (layout: GrpcPipelineLayout | undefined): PipelineLayout | null =>
  layout ? { ...(layout.start && { start: layout.start }), nodes: layout.nodes } : null;

export const layoutFromDomain = ({ start, nodes }: PipelineLayout): GrpcPipelineLayout => ({
  ...(start && { start }),
  nodes: { ...nodes },
});

export function toDomain(pipeline: Pipeline): PipelineEntity {
  return {
    id: idValue(pipeline.id),
    projectId: idValue(pipeline.projectId),
    name: pipeline.name,
    nodes: pipeline.nodes.map(nodeToDomain),
  };
}

export function toMetadata(pipeline: Pipeline): PipelineMetadata {
  return {
    id: idValue(pipeline.id),
    projectId: idValue(pipeline.projectId),
    name: pipeline.name,
    nodeCount: pipeline.nodes.length,
    createdAt: timestampToIso(pipeline.createdAt),
    updatedAt: timestampToIso(pipeline.updatedAt),
  };
}

/**
 * One page of the whole list. The server pages with tokens and has no count: the list is read
 * whole, then cut here, so that the page numbers of the UI stay.
 */
export function toMetadataPage(
  pipelines: Pipeline[],
  { page, pageSize }: PaginationParams,
): PaginatedList<PipelineMetadata> {
  const totalPages = Math.max(1, Math.ceil(pipelines.length / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: pipelines.slice(start, start + pageSize).map(toMetadata),
    pagination: {
      totalCount: pipelines.length,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}
