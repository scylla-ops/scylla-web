import type { FragmentParameter, PipelineNodeEntity } from '@base/features/pipeline';
import { marketplacePackageId } from '@base/features/pipeline';
import type {
  MarketPackage,
  PackageVersion,
  Publisher,
} from '@base/features/marketplace/domain/entities/market-package.entity.ts';

/** A package as the demo marketplace holds it: the star of the reader is kept apart. */
export type SeedPackage = Omit<MarketPackage, 'starred'>;

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const publisher = (handle: string, verified = true, official = false): Publisher => ({
  handle,
  verified,
  official,
});

/** Each node waits for the one before it, as in most shared fragments. */
const chain = (steps: ReadonlyArray<readonly [id: string, code: string]>): PipelineNodeEntity[] =>
  steps.map(([id, code], index) => ({
    id,
    deps: index ? [steps[index - 1][0]] : [],
    kind: 'script',
    shell: 'bash',
    script: code,
    env: [],
  }));

const literal = (key: string, value: string, description: string): FragmentParameter => ({
  key,
  kind: 'literal',
  default: value,
  description,
});

const secret = (key: string, description: string): FragmentParameter => ({
  key,
  kind: 'secret',
  description,
});

interface Release {
  number: number;
  days: number;
  installs: number;
  change: string;
  nodes?: PipelineNodeEntity[];
  parameters?: FragmentParameter[];
}

/** The versions of a package: a release without nodes or parameters keeps those of the latest. */
const versions = (
  owner: Publisher,
  nodes: PipelineNodeEntity[],
  parameters: FragmentParameter[],
  releases: Release[],
): PackageVersion[] =>
  releases.map(release => ({
    number: release.number,
    nodes: release.nodes ?? nodes,
    parameters: release.parameters ?? parameters,
    changes: [release.change],
    author: { id: owner.handle, name: `@${owner.handle}` },
    publishedAt: daysAgo(release.days),
    installs: release.installs,
  }));

type PackageSeed = Omit<SeedPackage, 'id' | 'installs' | 'readme'> & { readme?: string };

const pack = (seed: PackageSeed): SeedPackage => ({
  ...seed,
  id: marketplacePackageId(seed.publisher.handle, seed.name),
  installs: seed.versions.reduce((total, version) => total + version.installs, 0),
  readme: seed.readme ?? seed.description,
});

const KUBE_TOOLS = publisher('kube-tools');
const PNPM = publisher('pnpm');
const SECOPS = publisher('secops', false);
const SCYLLA = publisher('scylla', true, true);
const GOPHER = publisher('gopher', false);
const PYFOLKS = publisher('pyfolks');
const DOCS_KIT = publisher('docs-kit', false);
const MOBILE_CI = publisher('mobile-ci', false);

const HELM_NODES = chain([
  ['diff', 'helm diff upgrade "$RELEASE_NAME" ./chart -n "$NAMESPACE"'],
  ['upgrade', 'helm upgrade --install "$RELEASE_NAME" ./chart --atomic'],
  ['verify', 'kubectl rollout status "deploy/$RELEASE_NAME" -n "$NAMESPACE"'],
  ['rollback', 'helm rollback "$RELEASE_NAME" || true'],
]);

const HELM_PARAMETERS = [
  literal('RELEASE_NAME', '${pipeline.name}', 'Helm release name'),
  literal('NAMESPACE', 'default', 'Target namespace'),
  secret('KUBECONFIG', 'Cluster credentials, stay in your secrets'),
];

const pnpmNodes = (audit: boolean) =>
  chain([
    ['install', 'pnpm install --frozen-lockfile'],
    ['lint', 'pnpm lint'],
    ['test', 'pnpm test'],
    ...(audit ? [['audit', 'pnpm audit --audit-level high'] as const] : []),
  ]);

const nodeVersion = (value: string) =>
  literal('NODE_VERSION', value, 'Node.js version installed on the agent');

const BUILDX_PARAMETERS = [
  literal('REGISTRY', 'registry.example.com', 'Container registry'),
  literal('PLATFORMS', 'linux/amd64,linux/arm64', 'Target architectures'),
];

const buildxNodes = (sbom: boolean) =>
  chain([
    ['setup', 'docker buildx create --use'],
    ['build', 'docker buildx build --platform "$PLATFORMS" -t "$REGISTRY/app" .'],
    ...(sbom
      ? [
          [
            'sbom',
            'docker buildx imagetools inspect --format "{{json .SBOM}}" "$REGISTRY/app"',
          ] as const,
        ]
      : []),
    ['push', 'docker push "$REGISTRY/app"'],
  ]);

/** The packages of the demo: the library of the demo links or forks some of them. */
export const seedPackages = (): SeedPackage[] => [
  pack({
    name: 'helm-deploy',
    description: 'Helm upgrade with a diff preview, wait and automatic rollback.',
    publisher: KUBE_TOOLS,
    category: 'deploy',
    stacks: ['docker'],
    tags: ['kubernetes', 'helm'],
    versions: versions(KUBE_TOOLS, HELM_NODES, HELM_PARAMETERS, [
      { number: 5, days: 99, installs: 1300, change: 'Requires Helm 3.14 or later.' },
      {
        number: 6,
        days: 51,
        installs: 3400,
        change: 'Waits for the rollout before reporting success.',
      },
      {
        number: 7,
        days: 3,
        installs: 2100,
        change: 'Adds a diff step before upgrading, upgrades are now atomic.',
      },
    ]),
    deprecated: [],
    requirements: [
      { kind: 'agent', tool: 'helm 3.14+' },
      { kind: 'agent', tool: 'kubectl' },
      { kind: 'network', reaches: 'Reaches your cluster API' },
    ],
    readme:
      'Deploys a Helm chart in three steps: a diff of what changes, an atomic upgrade, then a wait on the rollout. A failed rollout rolls the release back.\n\nThe chart is read from ./chart in the repository.',
    stars: 412,
    createdAt: daysAgo(400),
  }),
  pack({
    name: 'node-ci',
    description: 'pnpm install with a store cache, lint and unit tests.',
    publisher: PNPM,
    category: 'ci',
    stacks: ['node'],
    tags: ['node', 'pnpm'],
    versions: versions(
      PNPM,
      pnpmNodes(false),
      [nodeVersion('20')],
      [
        { number: 7, days: 170, installs: 2800, change: 'Caches the pnpm store.' },
        { number: 8, days: 80, installs: 9600, change: 'Lint and tests run side by side.' },
        {
          number: 9,
          days: 0,
          installs: 2800,
          change: 'Adds pnpm audit, NODE_VERSION now defaults to 22. Drops Node 18 support.',
          nodes: pnpmNodes(true),
          parameters: [nodeVersion('22')],
        },
      ],
    ),
    deprecated: [],
    requirements: [{ kind: 'agent', tool: 'pnpm 9+' }],
    stars: 1100,
    createdAt: daysAgo(500),
  }),
  pack({
    name: 'trivy-scan',
    description: 'Scan images and repositories, fail on HIGH and CRITICAL.',
    publisher: SECOPS,
    category: 'security',
    stacks: ['docker'],
    tags: ['security', 'containers'],
    versions: versions(
      SECOPS,
      chain([
        ['fs', 'trivy fs --severity HIGH,CRITICAL --exit-code 1 .'],
        ['image', 'trivy image --exit-code 1 "$IMAGE"'],
        ['sarif', 'trivy fs --format sarif -o trivy.sarif .'],
      ]),
      [literal('IMAGE', 'app:latest', 'Image to scan')],
      [
        { number: 3, days: 90, installs: 4100, change: 'Scans the image after the repository.' },
        { number: 4, days: 30, installs: 5100, change: 'Writes a SARIF report.' },
      ],
    ),
    deprecated: [],
    requirements: [{ kind: 'agent', tool: 'trivy' }],
    stars: 640,
    createdAt: daysAgo(300),
  }),
  pack({
    name: 'docker-buildx',
    description: 'Multi-arch images with buildx and a registry cache.',
    publisher: SCYLLA,
    category: 'build',
    stacks: ['docker'],
    tags: ['docker', 'containers'],
    versions: versions(SCYLLA, buildxNodes(false), BUILDX_PARAMETERS, [
      { number: 4, days: 120, installs: 7300, change: 'Builds for arm64 with QEMU.' },
      {
        number: 5,
        days: 6,
        installs: 5100,
        change: 'Adds an SBOM step, drops the QEMU setup: buildx emulates.',
      },
    ]),
    deprecated: [],
    requirements: [
      { kind: 'agent', tool: 'docker 24+' },
      { kind: 'network', reaches: 'Pushes to your registry' },
    ],
    stars: 860,
    createdAt: daysAgo(600),
  }),
  pack({
    name: 'go-release',
    description: 'GoReleaser with checksums, SBOM and signed artifacts.',
    publisher: GOPHER,
    category: 'release',
    stacks: ['go'],
    tags: ['go', 'release'],
    versions: versions(
      GOPHER,
      chain([
        ['release', 'goreleaser release --clean'],
        ['sbom', 'syft . -o spdx-json > sbom.json'],
        ['sign', 'cosign sign-blob --key env://COSIGN_KEY dist/checksums.txt'],
      ]),
      [
        secret('COSIGN_KEY', 'Key that signs the checksums'),
        secret('GITHUB_TOKEN', 'Publishes the release'),
      ],
      [
        { number: 1, days: 60, installs: 900, change: 'First version.' },
        { number: 2, days: 8, installs: 1400, change: 'Signs the checksums with cosign.' },
      ],
    ),
    deprecated: [],
    requirements: [
      { kind: 'agent', tool: 'goreleaser' },
      { kind: 'agent', tool: 'cosign' },
    ],
    stars: 190,
    createdAt: daysAgo(60),
  }),
  pack({
    name: 'pytest-matrix',
    description: 'pytest on Python 3.10 to 3.13 with coverage report.',
    publisher: PYFOLKS,
    category: 'ci',
    stacks: ['python'],
    tags: ['python', 'tests'],
    versions: versions(
      PYFOLKS,
      chain([
        ['setup', 'uv sync'],
        ['test', 'uv run pytest -n auto'],
        ['coverage', 'uv run coverage xml'],
      ]),
      [literal('PYTHON_VERSIONS', '3.10 3.11 3.12 3.13', 'Interpreters to test on')],
      [
        { number: 5, days: 90, installs: 1900, change: 'Runs the tests in parallel.' },
        { number: 6, days: 21, installs: 2500, change: 'Adds Python 3.13.' },
      ],
    ),
    deprecated: [5],
    requirements: [{ kind: 'agent', tool: 'uv' }],
    stars: 276,
    createdAt: daysAgo(380),
  }),
  pack({
    name: 'mkdocs-pages',
    description: 'Build a MkDocs site and publish it to GitHub Pages.',
    publisher: DOCS_KIT,
    category: 'deploy',
    stacks: ['python'],
    tags: ['docs'],
    versions: versions(
      DOCS_KIT,
      chain([
        ['build', 'mkdocs build --strict'],
        ['deploy', 'mkdocs gh-deploy --force'],
      ]),
      [secret('GITHUB_TOKEN', 'Pushes the gh-pages branch')],
      [{ number: 1, days: 4, installs: 640, change: 'First version.' }],
    ),
    deprecated: [],
    requirements: [
      { kind: 'agent', tool: 'mkdocs' },
      { kind: 'network', reaches: 'Pushes to GitHub' },
    ],
    stars: 51,
    createdAt: daysAgo(4),
  }),
  pack({
    name: 'fastlane-ios',
    description: 'Fastlane match, build and TestFlight upload.',
    publisher: MOBILE_CI,
    category: 'release',
    stacks: [],
    tags: ['ios', 'mobile'],
    versions: versions(
      MOBILE_CI,
      chain([
        ['match', 'fastlane match appstore --readonly'],
        ['gym', 'fastlane gym'],
        ['pilot', 'fastlane pilot upload'],
      ]),
      [
        secret('MATCH_PASSWORD', 'Decrypts the certificates'),
        secret('APP_STORE_KEY', 'App Store Connect API key'),
      ],
      [{ number: 3, days: 14, installs: 1100, change: 'Uploads with an API key.' }],
    ),
    deprecated: [],
    requirements: [
      { kind: 'agent', tool: 'macOS with Xcode' },
      { kind: 'network', reaches: 'Reaches App Store Connect' },
    ],
    stars: 88,
    createdAt: daysAgo(200),
  }),
];
