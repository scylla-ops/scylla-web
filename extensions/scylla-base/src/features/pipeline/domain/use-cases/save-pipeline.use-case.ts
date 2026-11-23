import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { PipelineRepository } from '../repository/pipeline.repository.ts';
import { pipelineIssue } from '../entities/pipeline.entity.ts';
import type { PipelineNodeEntity } from '../entities/pipeline-node.entity.ts';
import type { PipelineIssue } from '../entities/pipeline.entity.ts';
import type { PipelineLayout } from '../structs/pipeline-layout.struct.ts';
import { linkHoldsVersion, type FragmentLink } from '../entities/fragment.entity.ts';
import type { FragmentRepository } from '../repository/fragment.repository.ts';

export interface SavePipelineInput {
  /** None for a new pipeline. */
  id?: string;
  projectId: string;
  name: string;
  nodes: PipelineNodeEntity[];
  /** The places of the nodes that the server does not hold yet. */
  layout?: PipelineLayout;
  /** The fragment links of a saved pipeline, sent with its nodes. None: the links stay. */
  links?: FragmentLink[];
  /** The workspace of the linked fragments: without it, each link is sent as it is. */
  workspaceId?: string;
}

/** The pipeline breaks a rule of the domain: nothing was sent to the server. */
export class InvalidPipelineError extends ScyllaError {
  constructor(public readonly issue: PipelineIssue) {
    super(`The pipeline cannot be saved: ${issue.kind}`, { code: 'INVALID_ARGUMENT' });
  }
}

/**
 * Applies the rules of the server before it is called: a name of one word, node ids, switches and
 * needs that it accepts. Drops the link of a block whose nodes were edited outside it (the
 * scripting tab): they no longer run its version. Then creates the pipeline, or edits it, and
 * returns the blocks that it detached.
 */
export class SavePipelineUseCase {
  constructor(
    private readonly _repository: PipelineRepository,
    private readonly _fragments?: FragmentRepository,
  ) {}

  public async execute({
    id,
    projectId,
    name,
    nodes,
    layout,
    links,
    workspaceId,
  }: SavePipelineInput): Promise<string[]> {
    const issue = pipelineIssue({ name, nodes });
    if (issue) throw new InvalidPipelineError(issue);

    if (!id) {
      await this._repository.create({ projectId, name, nodes }, layout);
      return [];
    }
    const kept = links && workspaceId ? await this.heldLinks(links, nodes, workspaceId) : links;
    await this._repository.edit(id, nodes, name, layout, kept);
    return (links ?? []).filter(link => !kept?.includes(link)).map(link => link.blockId);
  }

  /** A link whose version cannot be read (a deleted fragment, the network) stays as it is. */
  private async heldLinks(links: FragmentLink[], nodes: PipelineNodeEntity[], workspaceId: string) {
    const fragments = this._fragments;
    if (!fragments) return links;
    const held = await Promise.all(
      links.map(async link => {
        const fragment = await fragments.getById(workspaceId, link.fragmentId).catch(() => null);
        const version = fragment?.versions.find(entry => entry.number === link.version);
        return !version?.nodes.length || linkHoldsVersion(link, version, nodes);
      }),
    );
    return links.filter((_, index) => held[index]);
  }
}
