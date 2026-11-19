import type {
  FragmentAuthor,
  FragmentParameter,
  FragmentUsage,
  FragmentVersion,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

/** A fragment as the library stores it: the favorites and the links are kept apart. */
export interface StoredFragment {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  tags: string[];
  author: FragmentAuthor;
  versions: FragmentVersion[];
  /** Pipelines of the demo library, which no saved link holds. */
  seededUsages: FragmentUsage[];
}

const REM: FragmentAuthor = { id: 'seed-rem', name: 'Rem' };
const INES: FragmentAuthor = { id: 'seed-ines', name: 'Inès' };
const MALIK: FragmentAuthor = { id: 'seed-malik', name: 'Malik' };

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const script = (
  id: string,
  code: string,
  deps: string[] = [],
  env: string[] = [],
): PipelineNodeEntity => ({
  id,
  deps,
  kind: 'script',
  shell: 'bash',
  script: code,
  env: env.map(key => ({ key, kind: 'literal', value: '' })),
});

const usage = (pipelineName: string, projectName: string, version: number): FragmentUsage => ({
  pipelineId: `seed-${pipelineName}`,
  pipelineName,
  projectId: `seed-${projectName}`,
  projectName,
  version,
});

/** Versions with the same nodes, one per line of notes: the history of a fragment of the demo. */
const releases = (
  author: FragmentAuthor,
  nodes: PipelineNodeEntity[],
  parameters: FragmentParameter[],
  notes: { change: string; daysAgo: number }[],
): FragmentVersion[] =>
  notes.map((note, index) => ({
    number: index + 1,
    nodes,
    parameters,
    changes: [note.change],
    author,
    publishedAt: daysAgo(note.daysAgo),
  }));

const RUST_PARAMETERS: FragmentParameter[] = [
  {
    key: 'RUST_TOOLCHAIN',
    kind: 'literal',
    default: 'stable',
    description: 'Toolchain passed to rustup',
  },
  {
    key: 'CARGO_FLAGS',
    kind: 'literal',
    default: '--locked',
    description: 'Extra flags for every cargo call',
  },
  { key: 'REGISTRY_TOKEN', kind: 'secret', description: 'Token for the private crates registry' },
];

const command = (...parts: string[]) => parts.filter(Boolean).join(' ');

const rustNodes = (flags: string, withDeny: boolean): PipelineNodeEntity[] => {
  const env = ['RUST_TOOLCHAIN', 'CARGO_FLAGS', 'REGISTRY_TOKEN'];
  const nodes = [
    script('fmt', 'cargo fmt --check', [], env),
    script('clippy', command('cargo clippy', flags, '-- -D warnings'), ['fmt'], env),
    script('test', command('cargo test', flags), ['fmt'], env),
  ];
  return withDeny ? [...nodes, script('deny', 'cargo deny check', ['clippy', 'test'], env)] : nodes;
};

/** The library of a new workspace, so that the pages have something to show before a first save. */
export const seedFragments = (workspaceId: string): StoredFragment[] => [
  {
    id: `${workspaceId}:rust-ci`,
    workspaceId,
    name: 'rust-ci',
    description: 'Formatting, lint and tests for Rust crates. Fails on any clippy warning.',
    tags: ['rust', 'ci'],
    author: REM,
    versions: [
      {
        number: 1,
        nodes: rustNodes('', false),
        parameters: RUST_PARAMETERS,
        changes: ['First version, saved from api-backend.'],
        author: REM,
        publishedAt: daysAgo(38),
      },
      {
        number: 2,
        nodes: rustNodes('$CARGO_FLAGS', false),
        parameters: RUST_PARAMETERS,
        changes: ['Splits clippy and test, shared target cache.'],
        author: REM,
        publishedAt: daysAgo(22),
      },
      {
        number: 3,
        nodes: rustNodes('$CARGO_FLAGS', true),
        parameters: [
          RUST_PARAMETERS[0],
          {
            key: 'CARGO_FLAGS',
            kind: 'literal',
            default: '--locked --all-features',
            description: 'Extra flags for every cargo call',
          },
          RUST_PARAMETERS[2],
        ],
        changes: [
          'New node: cargo deny (licenses).',
          'CARGO_FLAGS default is now --locked --all-features.',
        ],
        author: REM,
        publishedAt: daysAgo(2),
      },
    ],
    seededUsages: [
      usage('billing-api', 'payments', 3),
      usage('ingest', 'data-platform', 1),
      usage('search', 'storefront', 3),
    ],
  },
  {
    id: `${workspaceId}:docker-publish`,
    workspaceId,
    name: 'docker-publish',
    description: 'Build, tag and push an image to the registry, with a layer cache.',
    tags: ['docker', 'deploy'],
    author: INES,
    versions: releases(
      INES,
      [
        script('build', 'docker build -t "$IMAGE" .', [], ['IMAGE']),
        script('tag', 'docker tag "$IMAGE" "$IMAGE:$TAG"', ['build'], ['IMAGE', 'TAG']),
        script('push', 'docker push "$IMAGE:$TAG"', ['tag'], ['IMAGE', 'TAG']),
      ],
      [
        { key: 'IMAGE', kind: 'literal', default: 'app' },
        { key: 'TAG', kind: 'literal', default: 'latest' },
      ],
      [
        { change: 'First version.', daysAgo: 60 },
        { change: 'Pushes the tag only, not latest.', daysAgo: 30 },
        { change: 'Uses the registry cache.', daysAgo: 7 },
      ],
    ),
    seededUsages: [usage('worker', 'storefront', 3), usage('gateway', 'payments', 2)],
  },
  {
    id: `${workspaceId}:node-ci`,
    workspaceId,
    name: 'node-ci',
    description: 'npm ci, lint and unit tests with a shared npm cache.',
    tags: ['node', 'ci'],
    author: MALIK,
    versions: releases(
      MALIK,
      [
        script('install', 'npm ci'),
        script('lint', 'npm run lint', ['install']),
        script('test', 'npm test', ['install']),
      ],
      [],
      [
        { change: 'First version.', daysAgo: 90 },
        { change: 'Runs lint and test together.', daysAgo: 20 },
      ],
    ),
    seededUsages: [usage('web', 'storefront', 2), usage('admin', 'backoffice', 1)],
  },
  {
    id: `${workspaceId}:deploy-k8s`,
    workspaceId,
    name: 'deploy-k8s',
    description: 'Helm upgrade with an automatic rollback when the probes fail.',
    tags: ['deploy'],
    author: REM,
    versions: releases(
      REM,
      [
        script(
          'helm-upgrade',
          'helm upgrade --install "$RELEASE" ./chart --atomic',
          [],
          ['RELEASE'],
        ),
        script('verify', 'kubectl rollout status "deploy/$RELEASE"', ['helm-upgrade'], ['RELEASE']),
      ],
      [{ key: 'RELEASE', kind: 'literal', default: 'app' }],
      [{ change: 'First version.', daysAgo: 1 }],
    ),
    seededUsages: [],
  },
  {
    id: `${workspaceId}:security-scan`,
    workspaceId,
    name: 'security-scan',
    description: 'Trivy image scan and cargo audit. Fails on a high severity.',
    tags: ['security', 'rust'],
    author: INES,
    versions: releases(
      INES,
      [
        script('trivy', 'trivy fs --severity HIGH,CRITICAL --exit-code 1 .'),
        script('cargo-audit', 'cargo audit'),
      ],
      [],
      [
        { change: 'First version.', daysAgo: 45 },
        { change: 'Scans the files, not the image.', daysAgo: 29 },
      ],
    ),
    seededUsages: [usage('api-backend', 'storefront', 2)],
  },
];
