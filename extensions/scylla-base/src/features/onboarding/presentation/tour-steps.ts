import type { MessageDescriptor } from '@lingui/core';
import { isActiveStatus } from '@base/features/jobs';
import { CREATE_PIPELINE_MUTATION_KEY, RUN_PIPELINE_MUTATION_KEY } from '@base/features/pipeline';
import { CREATE_PROJECT_MUTATION_KEY } from '@base/features/project';
import { scyllaNavigate } from '@platform/context';
import type { OnboardingSubject } from '../domain/structs/onboarding-status.struct.ts';
import { onboardingMessages as m } from './onboarding.messages.ts';

export const SCYLLA_DOCS_URL = 'https://github.com/scylla-ops/scylla';

export type TourAnchor = (root: ParentNode, subject: OnboardingSubject) => Element | null;

export type TourCondition =
  | { on: 'click'; anchor: TourAnchor }
  | { on: 'appear'; anchor: TourAnchor };

export type TourAdvance =
  | { on: 'next' }
  | TourCondition
  | {
      on: 'mutation';
      key: readonly unknown[];
      onSuccess?: (data: unknown, variables: unknown) => OnboardingSubject | undefined;
    };

export interface TourLink {
  label: MessageDescriptor;
  href: string;
}

export interface TourSpotStep {
  kind: 'spot';
  id: string;
  title: MessageDescriptor;
  body: readonly MessageDescriptor[];
  link?: TourLink;
  waiting?: MessageDescriptor;
  targets: readonly TourAnchor[];
  note?: { target: number; body: MessageDescriptor; link?: TourLink };
  advance: TourAdvance;
  nextWhen?: TourCondition;
  fallback?: string;
  wide?: boolean;
}

export interface TourDialogStep {
  kind: 'welcome' | 'finish';
  id: string;
}

export type TourStep = TourSpotStep | TourDialogStep;

const select =
  (selector: string): TourAnchor =>
  root =>
    root.querySelector(selector);

const within =
  (anchor: TourAnchor, selector: string): TourAnchor =>
  (root, subject) =>
    anchor(root, subject)?.querySelector(selector) ?? null;

const navLink = (url: string) => select(`[data-nav-url="${url}"]`);

const newButtonOf = (page: string) =>
  select(`[data-tour="${page}"] [data-part="feature-header-new"]`);

const formDialog: TourAnchor = root =>
  [...root.querySelectorAll('[data-slot="dialog-content"]')].find(dialog =>
    dialog.querySelector('form'),
  ) ?? null;

const secret = select('[data-part="secret-reveal-secret"]');

const agentStatus = select('[data-tour="agent-status"]');

const pipelineCell =
  (cell: string): TourAnchor =>
  (root, subject) => {
    const cells = [...root.querySelectorAll<HTMLElement>(`[data-tour="${cell}"]`)];
    return (
      cells.find(
        ({ dataset }) => !!subject.pipelineId && dataset.pipelineId === subject.pipelineId,
      ) ??
      cells.find(
        ({ dataset }) => !!subject.pipelineName && dataset.pipelineName === subject.pipelineName,
      ) ??
      cells[0] ??
      null
    );
  };

const pipelineHistory = pipelineCell('pipeline-history');

const runButton: TourAnchor = (root, subject) => {
  const actions = pipelineCell('pipeline-actions')(root, subject);
  return actions?.querySelector('[data-tour="pipeline-run"]') ?? actions;
};

const pipelineRow: TourAnchor = (root, subject) => {
  const history = pipelineHistory(root, subject);
  return history?.closest('tr') ?? history;
};

const lastRun: TourAnchor = (root, subject) => {
  const runs = pipelineHistory(root, subject)?.querySelectorAll('[data-item-id]');
  return runs?.length ? runs[runs.length - 1] : null;
};

const finishedRun: TourAnchor = (root, subject) => {
  const history = pipelineHistory(root, subject);
  const status = history instanceof HTMLElement ? history.dataset.lastStatus : undefined;
  return status && !isActiveStatus(status) ? history : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const openCreatedProject = (data: unknown) => {
  if (isRecord(data) && typeof data.id === 'string' && typeof data.name === 'string') {
    scyllaNavigate.goToProject(data.id, data.name);
  }
  return undefined;
};

const docs = (label: MessageDescriptor): TourLink => ({ label, href: SCYLLA_DOCS_URL });

export const TOUR_STEPS: readonly TourStep[] = [
  { kind: 'welcome', id: 'welcome' },
  {
    kind: 'spot',
    id: 'dashboard',
    title: m.dashboardTitle,
    body: [m.dashboardBody],
    targets: [select('[data-slot="sidebar-inset"]')],
    advance: { on: 'next' },
  },
  {
    kind: 'spot',
    id: 'navbar',
    title: m.navbarTitle,
    body: [m.navbarBody],
    targets: [select('[data-slot="sidebar-container"]')],
    advance: { on: 'next' },
  },
  {
    kind: 'spot',
    id: 'open-agents',
    title: m.openAgentsTitle,
    body: [m.openAgentsBody],
    targets: [navLink('agents')],
    advance: { on: 'click', anchor: navLink('agents') },
  },
  {
    kind: 'spot',
    id: 'new-agent',
    title: m.newAgentTitle,
    body: [m.newAgentBody],
    targets: [newButtonOf('agents')],
    advance: { on: 'click', anchor: newButtonOf('agents') },
    fallback: 'open-agents',
  },
  {
    kind: 'spot',
    id: 'create-agent',
    title: m.createAgentTitle,
    body: [m.createAgentBody],
    targets: [formDialog],
    advance: { on: 'appear', anchor: secret },
    fallback: 'new-agent',
  },
  {
    kind: 'spot',
    id: 'reveal-secret',
    title: m.revealSecretTitle,
    body: [m.revealSecretBody],
    link: docs(m.secretDocs),
    targets: [secret],
    advance: {
      on: 'appear',
      anchor: select('[data-part="secret-reveal-secret"][data-state="revealed"]'),
    },
    fallback: 'new-agent',
  },
  {
    kind: 'spot',
    id: 'copy-secret',
    title: m.copySecretTitle,
    body: [m.copySecretBody],
    link: docs(m.secretDocs),
    targets: [secret],
    advance: { on: 'next' },
    nextWhen: { on: 'click', anchor: within(secret, '[data-part="code-snippet-copy"]') },
    fallback: 'new-agent',
  },
  {
    kind: 'spot',
    id: 'run-command',
    title: m.runAgentTitle,
    body: [m.runCommandBody, m.runCommandUrl, m.runCommandHelp, m.runCommandDone],
    link: docs(m.connectDocs),
    targets: [
      select('[data-part="secret-reveal-next-step"]'),
      select('[data-part="secret-reveal-confirm"]'),
    ],
    advance: { on: 'click', anchor: select('[data-part="secret-reveal-confirm"]') },
    fallback: 'new-agent',
    wide: true,
  },
  {
    kind: 'spot',
    id: 'agent-page',
    title: m.agentPageTitle,
    body: [m.agentPageBody],
    targets: [select('[data-tour="agent-details"]')],
    advance: { on: 'next' },
  },
  {
    kind: 'spot',
    id: 'connect-agent',
    title: m.runAgentTitle,
    body: [m.connectAgentBody],
    waiting: m.connectAgentWaiting,
    targets: [agentStatus, select('[data-tour="agent-run"]')],
    note: { target: 1, body: m.connectAgentNote, link: docs(m.connectDocs) },
    advance: { on: 'appear', anchor: select('[data-tour="agent-status"][data-online="true"]') },
    nextWhen: { on: 'appear', anchor: select('[data-tour="agent-status"][data-online="true"]') },
    wide: true,
  },
  {
    kind: 'spot',
    id: 'open-projects',
    title: m.openProjectsTitle,
    body: [m.openProjectsBody],
    targets: [navLink('projects')],
    advance: { on: 'click', anchor: navLink('projects') },
  },
  {
    kind: 'spot',
    id: 'new-project',
    title: m.newProjectTitle,
    body: [m.newProjectBody],
    targets: [newButtonOf('projects')],
    advance: { on: 'click', anchor: newButtonOf('projects') },
    fallback: 'open-projects',
  },
  {
    kind: 'spot',
    id: 'create-project',
    title: m.createProjectTitle,
    body: [m.createProjectBody],
    targets: [formDialog],
    advance: { on: 'mutation', key: CREATE_PROJECT_MUTATION_KEY, onSuccess: openCreatedProject },
    fallback: 'new-project',
  },
  {
    kind: 'spot',
    id: 'new-pipeline',
    title: m.newPipelineTitle,
    body: [m.newPipelineBody],
    targets: [newButtonOf('pipelines')],
    advance: { on: 'click', anchor: newButtonOf('pipelines') },
  },
  {
    kind: 'spot',
    id: 'pipeline-editor',
    title: m.pipelineEditorTitle,
    body: [m.pipelineEditorBody],
    targets: [select('[data-tour="pipeline-editor"]')],
    advance: { on: 'next' },
    fallback: 'new-pipeline',
  },
  {
    kind: 'spot',
    id: 'create-pipeline',
    title: m.createPipelineTitle,
    body: [m.createPipelineBody],
    targets: [select('[data-tour="pipeline-submit"]')],
    advance: {
      on: 'mutation',
      key: CREATE_PIPELINE_MUTATION_KEY,
      onSuccess: (_data, variables) =>
        isRecord(variables) && typeof variables.name === 'string'
          ? { pipelineName: variables.name }
          : undefined,
    },
    fallback: 'new-pipeline',
  },
  {
    kind: 'spot',
    id: 'run-pipeline',
    title: m.runPipelineTitle,
    body: [m.runPipelineBody],
    targets: [runButton],
    advance: {
      on: 'mutation',
      key: RUN_PIPELINE_MUTATION_KEY,
      onSuccess: (_data, variables) =>
        typeof variables === 'string' ? { pipelineId: variables } : undefined,
    },
  },
  {
    kind: 'spot',
    id: 'wait-job',
    title: m.waitJobTitle,
    body: [m.waitJobBody, m.waitJobAgentHint],
    link: docs(m.waitJobDocs),
    targets: [pipelineRow],
    advance: { on: 'next' },
    nextWhen: { on: 'appear', anchor: finishedRun },
  },
  {
    kind: 'spot',
    id: 'open-job',
    title: m.openJobTitle,
    body: [m.openJobBody, m.openJobTip],
    targets: [lastRun],
    advance: { on: 'appear', anchor: select('[data-tour="job-details"]') },
  },
  {
    kind: 'spot',
    id: 'job-details',
    title: m.jobDetailsTitle,
    body: [m.jobDetailsBody],
    targets: [select('[data-tour="job-details"]')],
    advance: { on: 'next' },
  },
  { kind: 'finish', id: 'finish' },
];
