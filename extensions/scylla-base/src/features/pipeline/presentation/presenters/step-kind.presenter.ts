import BoxIcon from '@lucide/svelte/icons/box';
import FileCodeIcon from '@lucide/svelte/icons/file-code';
import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';
import GitBranchIcon from '@lucide/svelte/icons/git-branch';
import PackageIcon from '@lucide/svelte/icons/package';
import RocketIcon from '@lucide/svelte/icons/rocket';
import TerminalIcon from '@lucide/svelte/icons/terminal';
import type { LucideIcon } from '@scylla/ui';
import type { PipelineStepEntity } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';

type StepKind = PipelineStepEntity['kind'];

/** The icon hints a template may give. An unknown hint falls back to the kind of the step. */
const HINTED: Record<string, LucideIcon> = {
  git: GitBranchIcon,
  package: PackageIcon,
  test: FlaskConicalIcon,
  container: BoxIcon,
  deploy: RocketIcon,
};

const KIND_ICONS: Record<StepKind, LucideIcon> = {
  script: FileCodeIcon,
  exec: TerminalIcon,
};

export const stepIcon = (kind: StepKind, hint?: string): LucideIcon =>
  (hint ? HINTED[hint] : undefined) ?? KIND_ICONS[kind];

/** The kind is told by colour and icon together, never by colour alone. */
export const KIND_TONES: Record<
  StepKind,
  { text: string; tile: string; border: string; ring: string; handle: string }
> = {
  script: {
    text: 'text-primary',
    tile: 'bg-primary/12',
    border: 'border-primary',
    ring: 'ring-primary/20',
    handle: 'border-primary!',
  },
  exec: {
    text: 'text-chart-2',
    tile: 'bg-chart-2/12',
    border: 'border-chart-2',
    ring: 'ring-chart-2/25',
    handle: 'border-chart-2!',
  },
};
