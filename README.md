# Scylla Web

Welcome to the Scylla web client repository.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v9+)
- The Scylla backend running (`cargo run -p scylla-ce -- --config ../../binaries/scylla-ce/config/local.toml --no-ui`, port `8080` by default)

### Environment Variables

Copy the example file and adjust if needed:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | URL of the Scylla gRPC-Web backend. Only needed here: a deployed instance serves this bundle from the control plane itself, leaves the variable unset, and the client uses relative URLs. | `http://localhost:8080` |

### Install & Run

The `.proto` files are in `protos/`, the git submodule `scylla-ops/scylla-protos`: `protos/scylla` holds the contract, and `protos/google/rpc` the error details. Clone with `git clone --recurse-submodules`, or run `git submodule update --init` in a clone. After a change of the protos, move the submodule to the new commit and commit the new pin with the code that uses it.

```bash
# Install dependencies
pnpm install

# Start the dev server (includes proto generation + i18n compilation)
pnpm dev
```

The app will be available at `http://localhost:5173`. All commands run from the repository root.

### Other Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build locally |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run the tests of every package |
| `pnpm depcruise` | Check the package and module boundaries |
| `pnpm gen-proto` | Regenerate gRPC TypeScript clients from proto files |
| `pnpm extract` | Extract i18n translation strings |
| `pnpm compile` | Compile i18n translations |
| `pnpm tokens:export` | Write the design tokens of `styles.css` for Figma (`packages/ui/DESIGN-SYSTEM.md`) |
| `pnpm ui:catalog` | Open the visual catalog of `@scylla/ui` (Storybook) on port 6006 |

## Documentation

- [Architecture](docs/architecture.md) — Module structure, data flow, shared patterns, tech stack
- [Naming Conventions](docs/naming-conventions.md) — File, folder, TypeScript & Svelte naming rules
- [Design system](packages/ui/DESIGN-SYSTEM.md) — The code is the source of truth: how the tokens and the components go to the Figma library
- [CONTRIBUTING.md](CONTRIBUTING.md) — How to contribute: workflow, commits, pull requests, checks
- [AGENTS.md](AGENTS.md) — The working contract for this codebase (rules, checklists, conventions), for humans and AI coding agents

## Module documentation

The app is a pnpm workspace: a **core** that loads **extensions**, a design system, and the
SDKs through which extensions talk to the core and to each other. Each package and each module
has a **README.md** explaining what it does and why it is built that way, and an **AGENTS.md** —
a condensed, rule-focused brief for AI coding agents.

```
apps/web                   the product build: the list of extensions, main.ts
   ↓
packages/core              loads the extensions, router, shell frame — knows no business
extensions/scylla-base     the Scylla product: features, platform, shell parts
   ↓                       (an extension reaches another only through its SDK)
sdks/scylla-base-sdk       the public API of scylla-base, for other extensions
sdks/core-sdk              the extension contract: @Extension, ScyllaModule, navigation, DI, query, widgets
   ↓
packages/ui                the design system — imports no other package
```

### Packages

| Package | What it owns |
|---------|--------------|
| [apps/web](apps/web/README.md) | The build: `startCore` with the extensions of this build, the app-level conformance tests |
| [@scylla/core](packages/core/README.md) | Extension loader, route compilation and router (no router library), the shell frame |
| [@scylla/core-sdk](sdks/core-sdk/README.md) | `@Extension`, `ScyllaModule`, the navigation, DI and query API the core installs |
| [@scylla/ui](packages/ui/README.md) | primitives (adapted from shadcn/ui), generic composites, rune states, stores, i18n runtime, theme |
| [catalog](catalog/README.md) | The visual catalog of `@scylla/ui` (Storybook): each component, its variants and states, light and dark |
| [@scylla/base-sdk](sdks/scylla-base-sdk/README.md) | What other extensions may use of scylla-base |
| [scylla-base](extensions/scylla-base/README.md) | The Scylla product — the modules below |

### scylla-base — the shell

| Module | What it owns |
|--------|--------------|
| [shell](extensions/scylla-base/src/shell/README.md) | The feature list, `ShellModule`: mounts, sidebar sections, auth gate, context wrappers, error policy |

### scylla-base — `features/`

| Module | What it owns |
|--------|--------------|
| [apps](extensions/scylla-base/src/features/apps/README.md) | Machine identities, the agents that pick up jobs, their install and their run statistics |
| [dashboard](extensions/scylla-base/src/features/dashboard/README.md) | The workspace landing page — a composite view owning no data |
| [extensions](extensions/scylla-base/src/features/extensions/README.md) | The page that lists the extensions the app runs |
| [jobs](extensions/scylla-base/src/features/jobs/README.md) | Pipeline runs: status, logs, and the live tail of both |
| [login](extensions/scylla-base/src/features/login/README.md) | Sign-in, sign-out, the password reset and the session token |
| [marketplace](extensions/scylla-base/src/features/marketplace/README.md) | Ready-made pipeline templates |
| [notifications](extensions/scylla-base/src/features/notifications/README.md) | The inbox of the signed-in user: the bell, its panel and the full page |
| [membership](extensions/scylla-base/src/features/membership/README.md) | Who belongs to an workspace or project, and with which roles |
| [onboarding](extensions/scylla-base/src/features/onboarding/README.md) | The first-pipeline tour, and where its progress is kept |
| [workspace](extensions/scylla-base/src/features/workspace/README.md) | The top-level tenant and the switcher in the shell |
| [pipeline](extensions/scylla-base/src/features/pipeline/README.md) | Pipeline definitions, the visual + script editor, and running them |
| [project](extensions/scylla-base/src/features/project/README.md) | The unit that owns pipelines, secrets and members |
| [roles](extensions/scylla-base/src/features/roles/README.md) | Role catalog and grants |
| [secret](extensions/scylla-base/src/features/secret/README.md) | Project-scoped secrets injected into runs |
| [triggers](extensions/scylla-base/src/features/triggers/README.md) | What starts a pipeline without a human: schedules and webhooks |
| [user](extensions/scylla-base/src/features/user/README.md) | User accounts: the directory, the page of a user and the own account |

### scylla-base — `platform/`

| Module | What it owns |
|--------|--------------|
| [authz](extensions/scylla-base/src/platform/authz/README.md) | `Permission`, `can`, `Can`, `RequirePermission` — the read side of authorization |
| [context](extensions/scylla-base/src/platform/context/README.md) | The active workspace / project / pipeline, and navigation derived from it |
| [grpc](extensions/scylla-base/src/platform/grpc/README.md) | The single gRPC-Web transport, with auth attached |
| [user-state](extensions/scylla-base/src/platform/user-state/README.md) | The interface state of a person on the server, with `localStorage` as its read copy |

### scylla-base — `shared/`

| Module | What it owns |
|--------|--------------|
| [shared](extensions/scylla-base/src/shared/README.md) | `ScyllaError`, status presentation, the shared code with a business meaning |
