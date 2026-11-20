import type {
  FragmentAuthor,
  FragmentParameter,
  FragmentPublication,
  FragmentSource,
  FragmentUsage,
  FragmentVersion,
  PackageRef,
  ParameterValues,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { marketplacePackageId } from '@base/features/pipeline/domain/structs/fragment-publication.struct.ts';

/** A fragment as the library stores it: the favorites and the links are kept apart. */
export interface StoredFragment {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  tags: string[];
  author: FragmentAuthor;
  versions: FragmentVersion[];
  source?: FragmentSource;
  publication?: FragmentPublication;
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

const usage = (
  pipelineName: string,
  projectName: string,
  version: number,
  values: ParameterValues = {},
): FragmentUsage => ({
  pipelineId: `seed-${pipelineName}`,
  pipelineName,
  projectId: `seed-${projectName}`,
  projectName,
  version,
  values,
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
    // Public since its v3: the marketplace lists it under the scope of the workspace.
    publication: {
      name: 'rust-ci',
      license: 'MIT',
      category: 'ci',
      versions: [3],
      autoPublish: false,
      deprecated: [],
      publishedAt: daysAgo(2),
      publishedBy: REM,
      stats: {
        installs: 46,
        organizations: 9,
        stars: 12,
        forks: 1,
        adoption: [{ version: 3, organizations: 9 }],
      },
    },
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
  ...communityFragments(workspaceId),
];

const PNPM: FragmentAuthor = { id: 'pnpm', name: '@pnpm' };
const KUBE_TOOLS: FragmentAuthor = { id: 'kube-tools', name: '@kube-tools' };
const SECOPS: FragmentAuthor = { id: 'secops', name: '@secops' };
const SCYLLA: FragmentAuthor = { id: 'scylla', name: '@scylla' };

const packageRef = (publisher: string, name: string, verified = true): PackageRef => ({
  packageId: marketplacePackageId(publisher, name),
  publisher,
  name,
  verified,
});

const release = (
  number: number,
  author: FragmentAuthor,
  nodes: PipelineNodeEntity[],
  parameters: FragmentParameter[],
  change: string,
  days: number,
): FragmentVersion => ({
  number,
  nodes,
  parameters,
  changes: [change],
  author,
  publishedAt: daysAgo(days),
});

const nodeVersion = (value: string): FragmentParameter => ({
  key: 'NODE_VERSION',
  kind: 'literal',
  default: value,
  description: 'Node.js version installed on the agent',
});

const pnpmNodes = (audit: boolean): PipelineNodeEntity[] => {
  const env = ['NODE_VERSION'];
  const nodes = [
    script('install', 'pnpm install --frozen-lockfile', [], env),
    script('lint', 'pnpm lint', ['install'], env),
    script('test', 'pnpm test', ['install'], env),
  ];
  return audit
    ? [...nodes, script('audit', 'pnpm audit --audit-level high', ['install'], env)]
    : nodes;
};

const HELM_PARAMETERS: FragmentParameter[] = [
  { key: 'RELEASE_NAME', kind: 'literal', default: 'app', description: 'Helm release name' },
  { key: 'NAMESPACE', kind: 'literal', default: 'default', description: 'Target namespace' },
  { key: 'KUBECONFIG', kind: 'secret', description: 'Cluster credentials, stay in your secrets' },
];

const helmNodes = (): PipelineNodeEntity[] => {
  const env = ['RELEASE_NAME', 'NAMESPACE', 'KUBECONFIG'];
  return [
    script('diff', 'helm diff upgrade "$RELEASE_NAME" ./chart -n "$NAMESPACE"', [], env),
    script('upgrade', 'helm upgrade --install "$RELEASE_NAME" ./chart --atomic', ['diff'], env),
    script(
      'verify',
      'kubectl rollout status "deploy/$RELEASE_NAME" -n "$NAMESPACE"',
      ['upgrade'],
      env,
    ),
  ];
};

const DOCKER_PARAMETERS: FragmentParameter[] = [
  {
    key: 'REGISTRY',
    kind: 'literal',
    default: 'registry.example.com',
    description: 'Container registry',
  },
  {
    key: 'PLATFORMS',
    kind: 'literal',
    default: 'linux/amd64,linux/arm64',
    description: 'Target architectures',
  },
];

const buildxNodes = (qemu: boolean): PipelineNodeEntity[] => {
  const env = ['REGISTRY', 'PLATFORMS'];
  const build = script(
    'build',
    'docker buildx build --platform "$PLATFORMS" -t "$REGISTRY/app" .',
    ['setup'],
    env,
  );
  const push = script('push', 'docker push "$REGISTRY/app"', ['build'], env);
  return qemu
    ? [
        script(
          'setup',
          'docker run --privileged tonistiigi/binfmt --install all && docker buildx create --use',
          [],
          env,
        ),
        build,
        push,
      ]
    : [
        script('setup', 'docker buildx create --use', [], env),
        build,
        script(
          'sbom',
          'docker buildx imagetools inspect --format "{{json .SBOM}}" "$REGISTRY/app"',
          ['build'],
          env,
        ),
        push,
      ];
};

/** The fragments that the workspace took from the marketplace: linked, or forked. */
const communityFragments = (workspaceId: string): StoredFragment[] => {
  const nodeCi = (number: number, audit: boolean, version: string, change: string, days: number) =>
    release(number, PNPM, pnpmNodes(audit), [nodeVersion(version)], change, days);
  const buildx = (number: number, qemu: boolean, change: string, days: number) =>
    release(number, SCYLLA, buildxNodes(qemu), DOCKER_PARAMETERS, change, days);
  const forkParameters: FragmentParameter[] = [
    {
      key: 'REGISTRY',
      kind: 'literal',
      default: 'registry.acme.io',
      description: 'Acme container registry',
    },
    DOCKER_PARAMETERS[1],
    { key: 'COSIGN_KEY', kind: 'secret', description: 'Key used to sign images' },
  ];
  const forkNodes = [
    ...buildxNodes(true).filter(node => node.id !== 'push'),
    script('sign', 'cosign sign --key env://COSIGN_KEY "$REGISTRY/app"', ['build'], ['COSIGN_KEY']),
    script('push', 'docker push "$REGISTRY/app"', ['sign'], ['REGISTRY']),
  ];

  return [
    {
      id: `${workspaceId}:helm-deploy`,
      workspaceId,
      name: 'helm-deploy',
      description: 'Helm upgrade with a diff preview, wait and automatic rollback.',
      tags: ['deploy', 'kubernetes'],
      author: REM,
      versions: [
        release(
          7,
          KUBE_TOOLS,
          helmNodes(),
          HELM_PARAMETERS,
          'Adds a diff step before upgrading.',
          3,
        ),
      ],
      source: {
        kind: 'linked',
        package: packageRef('kube-tools', 'helm-deploy'),
        addedAt: daysAgo(0),
        upstream: [],
        skipped: [],
      },
      seededUsages: [],
    },
    {
      id: `${workspaceId}:node-ci`,
      workspaceId,
      name: 'node-ci',
      description: 'pnpm install with a store cache, lint and unit tests.',
      tags: ['node', 'ci'],
      author: MALIK,
      versions: [nodeCi(8, false, '20', 'In the Acme library since Sep 2.', 80)],
      source: {
        kind: 'linked',
        package: packageRef('pnpm', 'node-ci'),
        addedAt: daysAgo(79),
        upstream: [
          nodeCi(7, false, '20', 'Caches the pnpm store.', 170),
          release(
            9,
            PNPM,
            pnpmNodes(true),
            [nodeVersion('22')],
            'Adds pnpm audit, NODE_VERSION now defaults to 22. Drops Node 18 support.',
            0,
          ),
        ],
        skipped: [7],
      },
      seededUsages: [
        usage('api-backend', 'storefront', 8),
        usage('web', 'storefront', 8),
        usage('admin', 'backoffice', 8, { NODE_VERSION: '18' }),
        usage('legacy-web', 'storefront', 8, { NODE_VERSION: '18' }),
      ],
    },
    {
      id: `${workspaceId}:trivy-scan`,
      workspaceId,
      name: 'trivy-scan',
      description: 'Scan images and repositories, fail on HIGH and CRITICAL.',
      tags: ['security'],
      author: INES,
      versions: [
        release(
          4,
          SECOPS,
          [
            script('fs', 'trivy fs --severity HIGH,CRITICAL --exit-code 1 .'),
            script('image', 'trivy image --exit-code 1 "$IMAGE"', ['fs'], ['IMAGE']),
            script('sarif', 'trivy fs --format sarif -o trivy.sarif .', ['fs']),
          ],
          [{ key: 'IMAGE', kind: 'literal', default: 'app:latest', description: 'Image to scan' }],
          'Writes a SARIF report.',
          30,
        ),
      ],
      source: {
        kind: 'linked',
        package: packageRef('secops', 'trivy-scan', false),
        addedAt: daysAgo(30),
        upstream: [],
        skipped: [],
      },
      seededUsages: [
        usage('api-backend', 'storefront', 4),
        usage('worker', 'storefront', 4),
        usage('billing-api', 'payments', 4),
      ],
    },
    {
      id: `${workspaceId}:docker-build`,
      workspaceId,
      name: 'docker-build',
      description: 'Multi-arch images with buildx, the Acme registry and cosign signing.',
      tags: ['docker', 'build'],
      author: INES,
      versions: [
        release(
          1,
          INES,
          buildxNodes(true),
          forkParameters.slice(0, 2),
          'Forked from @scylla/docker-buildx v4, registry set to Acme.',
          48,
        ),
        release(2, INES, forkNodes, forkParameters, 'Adds cosign signing before push.', 30),
      ],
      source: {
        kind: 'forked',
        package: packageRef('scylla', 'docker-buildx'),
        addedAt: daysAgo(48),
        baseVersion: 4,
        upstream: buildx(5, false, 'Adds SBOM attestation, drops the QEMU setup step.', 6),
      },
      seededUsages: [
        usage('api-backend', 'storefront', 2),
        usage('worker', 'storefront', 2),
        usage('billing-api', 'payments', 1),
        usage('ingest', 'data-platform', 1),
      ],
    },
  ];
};
