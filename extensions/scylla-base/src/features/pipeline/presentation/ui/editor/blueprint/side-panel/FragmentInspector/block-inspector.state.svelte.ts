import {
  carryValues,
  latestVersion,
  proposedVersion,
  versionOf,
  versionsBehind,
  type FragmentEntity,
  type FragmentVersion,
  type ParameterValues,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type { FragmentFlowNodeData } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
import type { BlockContent } from '../../blueprint.state.svelte.ts';

export interface BlockInspectorParams {
  block: () => FragmentFlowNodeData;
  /** `undefined` while the library loads, or when the fragment left it: the block cannot change. */
  fragment: () => FragmentEntity | undefined;
  onChange: (content: BlockContent, skippedVersion?: number) => void;
}

/** The inspector of a block: its version, the values of its parameters, the version it is proposed. */
export const createBlockInspector = (params: BlockInspectorParams) => {
  const link = $derived(params.block().link);
  const fragment = $derived(params.fragment());
  const version = $derived(fragment && versionOf(fragment, link.version));
  const proposed = $derived(fragment ? proposedVersion(fragment, link) : null);

  const apply = (next: FragmentVersion, values: ParameterValues, skipped = link.skippedVersion) => {
    if (fragment) params.onChange({ fragment, version: next, values }, skipped);
  };

  return {
    get link() {
      return link;
    },
    get fragment() {
      return fragment;
    },
    get version() {
      return version;
    },
    get proposed() {
      return proposed;
    },
    get behind() {
      return fragment ? versionsBehind(fragment, link) : 0;
    },
    get isLatest() {
      return !!fragment && latestVersion(fragment).number === link.version;
    },
    /** The newest first. */
    get versions() {
      return fragment ? [...fragment.versions].reverse() : [];
    },

    setValue(key: string, value: string) {
      if (version) apply(version, { ...link.values, [key]: value });
    },

    switchTo(number: number) {
      const next = fragment && versionOf(fragment, number);
      if (next) apply(next, carryValues(next.parameters, link.values));
    },

    /** The pipeline keeps its version: the newer one is no longer proposed. */
    stay() {
      if (version && proposed) apply(version, link.values, proposed.number);
    },
  };
};

export type BlockInspector = ReturnType<typeof createBlockInspector>;
