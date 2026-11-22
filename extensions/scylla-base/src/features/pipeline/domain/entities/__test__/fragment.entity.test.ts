// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  canDeleteFragment,
  canPublishVersion,
  carryValues,
  detectParameters,
  editedParameters,
  fragmentDeleteIssue,
  fragmentNodesOf,
  instantiate,
  missingParameters,
  proposedVersion,
  valuesOf,
  versionsBehind,
  type FragmentEntity,
  type FragmentLink,
  type FragmentParameter,
  type FragmentVersion,
} from '../fragment.entity.ts';
import type { ExecPipelineNodeEntity, EnvEntry } from '../pipeline-node.entity.ts';

const node = (id: string, deps: string[] = [], env: EnvEntry[] = []): ExecPipelineNodeEntity => ({
  id,
  deps: deps.map(need => ({ node: need })),
  kind: 'exec',
  command: 'cargo',
  args: [id],
  env,
});

const author = { id: 'rem', name: 'Rem' };

const TOOLCHAIN: FragmentParameter = { key: 'RUST_TOOLCHAIN', kind: 'literal', default: 'stable' };
const TOKEN: FragmentParameter = { key: 'REGISTRY_TOKEN', kind: 'secret' };

const version = (number: number, parameters: FragmentParameter[] = []): FragmentVersion => ({
  number,
  nodes: [
    node('fmt', [], [{ key: 'RUST_TOOLCHAIN', kind: 'literal', value: 'stable' }]),
    node('publish', ['fmt'], [{ key: 'REGISTRY_TOKEN', kind: 'secret', secretRef: '' }]),
  ],
  parameters,
  changes: [],
  author,
  publishedAt: `2026-11-0${number}T10:00:00Z`,
});

const fragment = (versions: FragmentVersion[]): FragmentEntity => ({
  id: 'f1',
  workspaceId: 'acme',
  name: 'rust-ci',
  description: '',
  tags: [],
  author,
  versions,
  favorite: false,
  usages: [],
});

const link = (overrides: Partial<FragmentLink> = {}): FragmentLink => ({
  blockId: 'rust-ci',
  fragmentId: 'f1',
  version: 1,
  values: {},
  nodeIds: [],
  ...overrides,
});

describe('fragment versions', () => {
  it('proposes the latest version to a pipeline that links an older one', () => {
    const rustCi = fragment([version(1), version(2), version(3)]);

    expect(proposedVersion(rustCi, link())?.number).toBe(3);
    expect(versionsBehind(rustCi, link())).toBe(2);
  });

  it('proposes nothing once the pipeline skipped the latest version, until a newer one comes', () => {
    expect(
      proposedVersion(fragment([version(1), version(2)]), link({ skippedVersion: 2 })),
    ).toBeNull();
    expect(
      proposedVersion(fragment([version(1), version(2), version(3)]), link({ skippedVersion: 2 }))
        ?.number,
    ).toBe(3);
  });

  it('lets only the author and the admins publish a version', () => {
    const rustCi = fragment([version(1)]);

    expect(canPublishVersion(rustCi, { id: 'rem', admin: false })).toBe(true);
    expect(canPublishVersion(rustCi, { id: 'ines', admin: true })).toBe(true);
    expect(canPublishVersion(rustCi, { id: 'ines', admin: false })).toBe(false);
  });
});

describe('fragment parameters', () => {
  it('drops a dependency on a node outside the selection', () => {
    expect(fragmentNodesOf([node('test', ['build', 'fmt']), node('fmt')]).map(n => n.deps)).toEqual(
      [[{ node: 'fmt' }], []],
    );
  });

  it('detects each variable once, a literal with its value as default', () => {
    const nodes = [
      node('fmt', [], [{ key: 'RUST_TOOLCHAIN', kind: 'literal', value: 'nightly' }]),
      node(
        'test',
        [],
        [
          { key: 'RUST_TOOLCHAIN', kind: 'literal', value: 'stable' },
          { key: 'REGISTRY_TOKEN', kind: 'secret', secretRef: 'crates-io' },
        ],
      ),
    ];

    expect(detectParameters(nodes)).toEqual([
      { key: 'RUST_TOOLCHAIN', kind: 'literal', default: 'nightly' },
      { key: 'REGISTRY_TOKEN', kind: 'secret' },
    ]);
  });

  it('reads the values that the nodes had before they became a block', () => {
    const nodes = [
      node('publish', [], [{ key: 'REGISTRY_TOKEN', kind: 'secret', secretRef: 'crates-io' }]),
    ];

    expect(valuesOf(nodes, [TOOLCHAIN, TOKEN])).toEqual({
      RUST_TOOLCHAIN: 'stable',
      REGISTRY_TOKEN: 'crates-io',
    });
  });

  it('keeps the values of the pipeline on another version, and gives a new parameter its default', () => {
    expect(carryValues([TOOLCHAIN, TOKEN], { REGISTRY_TOKEN: 'crates-io', OLD: 'x' })).toEqual({
      RUST_TOOLCHAIN: 'stable',
      REGISTRY_TOKEN: 'crates-io',
    });
  });

  it('asks for a secret that has no value: a literal always has one', () => {
    expect(
      missingParameters([TOOLCHAIN, TOKEN], { RUST_TOOLCHAIN: '', REGISTRY_TOKEN: ' ' }),
    ).toEqual([TOKEN]);
  });
});

describe('instantiate', () => {
  it('prefixes the ids with the block, so that two blocks of one fragment do not share an id', () => {
    const nodes = instantiate(version(1, [TOOLCHAIN, TOKEN]), 'rust-ci', {
      RUST_TOOLCHAIN: 'nightly',
    });

    expect(nodes.map(n => [n.id, n.deps])).toEqual([
      ['rust-ci-fmt', []],
      ['rust-ci-publish', [{ node: 'rust-ci-fmt' }]],
    ]);
  });

  it('gives each node the values of the pipeline, and leaves out a secret with none', () => {
    const [fmt, publish] = instantiate(version(1, [TOOLCHAIN, TOKEN]), 'rust-ci', {
      RUST_TOOLCHAIN: 'nightly',
    });

    expect(fmt).toMatchObject({ env: [{ key: 'RUST_TOOLCHAIN', kind: 'literal', value: 'nightly' }] });
    expect(publish).toMatchObject({ env: [] });
  });
});

describe('editedParameters', () => {
  it('keeps the choices of the author, adds a new variable and drops a removed one', () => {
    // RUST_TOOLCHAIN was left inline by the author: an edit does not expose it.
    const previous = version(2, [TOKEN]);
    const nodes = [
      node(
        'fmt',
        [],
        [
          { key: 'RUST_TOOLCHAIN', kind: 'literal', value: 'stable' },
          { key: 'CARGO_FLAGS', kind: 'literal', value: '--locked' },
        ],
      ),
    ];

    expect(editedParameters(previous, nodes)).toEqual([
      { key: 'CARGO_FLAGS', kind: 'literal', default: '--locked' },
    ]);
    expect(editedParameters(previous, previous.nodes)).toEqual([TOKEN]);
  });
});

describe('canDeleteFragment', () => {
  const own = { author, source: undefined };
  const linked = {
    author,
    source: { kind: 'linked' as const } as FragmentEntity['source'],
  };

  it('lets the author and the admins delete a fragment of the workspace', () => {
    expect(canDeleteFragment(own, { id: 'rem', admin: false })).toBe(true);
    expect(canDeleteFragment(own, { id: 'ines', admin: false })).toBe(false);
    expect(canDeleteFragment(own, { id: 'ines', admin: true })).toBe(true);
  });

  it('keeps a linked fragment for the admins: it comes from the marketplace', () => {
    expect(canDeleteFragment(linked, { id: 'rem', admin: false })).toBe(false);
    expect(canDeleteFragment(linked, { id: 'rem', admin: true })).toBe(true);
  });

  it('never deletes a public fragment: other workspaces link it', () => {
    expect(fragmentDeleteIssue({ publication: undefined })).toBeNull();
    expect(
      fragmentDeleteIssue({ publication: {} as NonNullable<FragmentEntity['publication']> }),
    ).toBe('public');
  });
});
