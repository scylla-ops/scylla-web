import BoxIcon from '@lucide/svelte/icons/box';
import FileCodeIcon from '@lucide/svelte/icons/file-code';
import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';
import GitBranchIcon from '@lucide/svelte/icons/git-branch';
import PackageIcon from '@lucide/svelte/icons/package';
import PlayIcon from '@lucide/svelte/icons/play';
import RocketIcon from '@lucide/svelte/icons/rocket';
import TerminalIcon from '@lucide/svelte/icons/terminal';
import type { LucideIcon } from '@scylla/ui';
import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';

/** The icon hints a template may give. An unknown hint falls back to the kind of the step. */
const HINTED: Record<string, LucideIcon> = {
  git: GitBranchIcon,
  package: PackageIcon,
  test: FlaskConicalIcon,
  container: BoxIcon,
  deploy: RocketIcon,
};

export const KIND_ICONS: Record<PipelineStep['kind'], LucideIcon> = {
  script: FileCodeIcon,
  exec: TerminalIcon,
};

export const START_ICON = PlayIcon;

export const stepIcon = (kind: PipelineStep['kind'], hint?: string): LucideIcon =>
  (hint ? HINTED[hint] : undefined) ?? KIND_ICONS[kind];
