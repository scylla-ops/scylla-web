import { Permission, can } from '@platform/authz';
import { activeWorkspaceSlug, contextStore, scyllaHref } from '@platform/context';
import { t } from '@scylla/ui/i18n';
import { integrationsUrl } from '@base/features/integrations';
import type { PipelineSummary } from '@base/features/pipeline';
import type { ActivityEvent } from '@base/features/dashboard/domain/structs/activity.struct.ts';
import type { AttentionItem } from '@base/features/dashboard/domain/structs/attention.struct.ts';
import type { JobPlace } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
import { linkMessages } from '@base/features/dashboard/presentation/messages/links.messages.ts';
import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';

/** The project, and the pipeline, of the page that a link opens. */
export interface LinkPlace {
  projectId: string;
  projectName: string;
  pipelineId?: string;
  pipelineName?: string;
}

/** A page that a widget opens, and its project when it has one. */
export interface LinkTarget {
  href: string;
  place?: LinkPlace;
  /** What a click opens, when the caller does not tell it. */
  title?: string;
}

/** A pipeline, as a summary or a row of a widget gives it. */
interface PipelineRef {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
}

/** A click that the router follows in this tab: the main button, with no modifier key. */
const opensHere = (event: MouseEvent): boolean =>
  event.button === 0 &&
  !event.defaultPrevented &&
  !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);

/**
 * The click handler of a link into a project. The dashboard has no project: before the router
 * opens the page, the store gets the names of the project and of the pipeline, as
 * `scyllaNavigate` does, so that the crumbs and the permissions follow at once. A new tab reads
 * the project from the URL.
 */
export const enterPlace =
  (place: LinkPlace) =>
  (event: MouseEvent): void => {
    if (!place.projectId || !opensHere(event)) return;
    const store = contextStore.getState();
    store.setProject(place.projectId, place.projectName);
    if (place.pipelineId && place.pipelineName) {
      store.setPipeline(place.pipelineId, place.pipelineName);
    }
  };

const pipelinePlace = (pipeline: PipelineRef): LinkPlace => ({
  projectId: pipeline.projectId,
  projectName: pipeline.projectName,
  pipelineId: pipeline.id,
  pipelineName: pipeline.name,
});

/**
 * The page of a job; with a node, on the logs of that node. `null` when the dashboard does not
 * know the project of the job.
 */
export const jobLink = (job: Omit<JobPlace, 'shortId'>, nodeId?: string): LinkTarget | null =>
  job.projectId
    ? {
        href: scyllaHref.job(job.projectId, job.pipelineId, job.jobId, nodeId),
        place: pipelinePlace({ ...job, id: job.pipelineId, name: job.pipelineName }),
      }
    : null;

/** The props of a `JobRunMark` that opens its job: a link, and the names of its project. */
export const jobMarkLink = (
  job: Omit<JobPlace, 'shortId'>,
): { href?: string; onSelect?: (event: MouseEvent) => void } => {
  const link = jobLink(job);
  return link?.place ? { href: link.href, onSelect: enterPlace(link.place) } : {};
};

/** The jobs of a pipeline. `null` for a pipeline that the dashboard does not know. */
export const pipelineJobsLink = (pipeline: PipelineRef | undefined): LinkTarget | null =>
  pipeline?.projectId
    ? { href: scyllaHref.jobs(pipeline.projectId, pipeline.id), place: pipelinePlace(pipeline) }
    : null;

/** The triggers of a pipeline. `null` without the right to manage them: the page refuses. */
export const triggersLink = (trigger: {
  pipelineId: string;
  pipelineName: string;
  projectId: string;
  projectName: string;
}): LinkTarget | null =>
  trigger.projectId && can(Permission.MANAGE_TRIGGERS)
    ? {
        href: scyllaHref.triggers(trigger.projectId, trigger.pipelineId),
        place: pipelinePlace({ ...trigger, id: trigger.pipelineId, name: trigger.pipelineName }),
      }
    : null;

export const agentLink = (agentId: string): LinkTarget => ({ href: scyllaHref.agent(agentId) });

export const agentsLink = (): LinkTarget => ({ href: scyllaHref.agents() });

export const projectLink = (projectId: string, projectName: string): LinkTarget => ({
  href: scyllaHref.project(projectId),
  place: { projectId, projectName },
});

/** A link that adds the first item of an empty widget, and the label of its button. */
export interface AddLink {
  href: string;
  label: string;
}

/** The setup of a new agent. `null` without the right to add one: the empty widget has no button. */
export const newAgentLink = (): AddLink | null =>
  can(Permission.CREATE_APP)
    ? { href: `${scyllaHref.agents()}/new`, label: t(widgetMessages.addAgent) }
    : null;

/**
 * The first pipeline of the scope: the editor in the project of the scope, else a new project
 * for the whole workspace. `null` without the right.
 */
export const firstPipelineLink = (projectId: string | undefined): AddLink | null => {
  if (projectId) {
    return can(Permission.CREATE_PIPELINE, { projectId })
      ? { href: `${scyllaHref.project(projectId)}/create`, label: t(linkMessages.newPipeline) }
      : null;
  }
  const slug = activeWorkspaceSlug();
  return slug && can(Permission.CREATE_PROJECT)
    ? { href: `/${slug}/projects/new`, label: t(linkMessages.newProject) }
    : null;
};

export const integrationsLink = (): LinkTarget => ({
  href: integrationsUrl(activeWorkspaceSlug() ?? ''),
});

/** The page of an item of Needs you: its job, the triggers of its pipeline, or its agent. */
export const attentionLink = (item: AttentionItem): LinkTarget | null => {
  if (item.job) return jobLink({ ...item, jobId: item.job.id });
  if (item.fire) return triggersLink(item);
  return item.agent ? agentLink(item.agent.id) : null;
};

/** An event names its pipeline, not its id: the one pipeline of this name in the project. */
const pipelineNamed = (
  pipelines: ReadonlyMap<string, PipelineSummary>,
  projectId: string,
  name: string | undefined,
): PipelineSummary | undefined => {
  if (!projectId || !name) return undefined;
  const found = [...pipelines.values()].filter(
    pipeline => pipeline.projectId === projectId && pipeline.name === name,
  );
  return found.length === 1 ? found[0] : undefined;
};

const titled = (link: LinkTarget | null, title: string): LinkTarget | null =>
  link && { ...link, title };

/**
 * The page of the subject of an event of the activity: the job, the triggers of the pipeline,
 * the agent, or the Integrations page. `null`: the event has no page, or its pipeline is not in
 * the pipelines that the dashboard knows.
 */
export const activityLink = (
  event: ActivityEvent,
  pipelines: ReadonlyMap<string, PipelineSummary>,
): LinkTarget | null => {
  const area = event.kind.split('.')[0];
  if (area === 'job' || area === 'trigger') {
    const pipeline = pipelineNamed(pipelines, event.projectId, event.params.pipeline);
    if (!pipeline) return null;
    if (area === 'trigger') {
      return titled(
        triggersLink({ ...pipeline, pipelineId: pipeline.id, pipelineName: pipeline.name }),
        t(linkMessages.openTriggers),
      );
    }
    if (!event.subjectId) return null;
    return {
      href: scyllaHref.job(pipeline.projectId, pipeline.id, event.subjectId),
      place: pipelinePlace(pipeline),
      title: t(linkMessages.openJob),
    };
  }
  if (area === 'agent' && event.subjectId) {
    return titled(agentLink(event.subjectId), t(linkMessages.openAgent));
  }
  if (area === 'connection') return titled(integrationsLink(), t(linkMessages.openIntegrations));
  return null;
};
