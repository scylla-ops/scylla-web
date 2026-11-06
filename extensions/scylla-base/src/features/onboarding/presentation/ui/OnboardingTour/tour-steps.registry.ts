import type { MessageDescriptor } from '@lingui/core';
import { isActiveStatus } from '@base/features/jobs';
import { CREATE_PIPELINE_MUTATION_KEY, RUN_PIPELINE_MUTATION_KEY } from '@base/features/pipeline';
import { CREATE_PROJECT_MUTATION_KEY } from '@base/features/project';
import { CREATE_ROLE_MUTATION_KEY } from '@base/features/roles';
import { CREATE_SECRET_MUTATION_KEY } from '@base/features/secret';
import { CREATE_TRIGGER_MUTATION_KEY } from '@base/features/triggers';
import { Permission } from '@platform/authz';
import type { OnboardingSubject } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
import { onboardingMessages as m } from '@base/features/onboarding/presentation/messages/onboarding.messages.ts';

export const SCYLLA_DOCS_URL = 'https://prelude.scylla-ops.com';

export type TourAnchor = (root: ParentNode, subject: OnboardingSubject) => Element | null;

export type TourCondition =
  | { on: 'click'; anchor: TourAnchor }
  | {
      on: 'appear';
      anchor: TourAnchor;
      found?: (element: Element) => OnboardingSubject | undefined;
    };

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

/** The button of the page that the card repeats in its corner: same state, same click. */
export interface TourAction {
  anchor: TourAnchor;
  label?: MessageDescriptor;
  ready?: { title: MessageDescriptor; body: readonly MessageDescriptor[] };
}

export interface TourSpotStep {
  id: string;
  title: MessageDescriptor;
  body: readonly MessageDescriptor[];
  link?: TourLink;
  waiting?: MessageDescriptor;
  targets: readonly TourAnchor[];
  advance: TourAdvance;
  action?: TourAction;
  nextWhen?: TourCondition;
  fallback?: string;
  page?: (subject: OnboardingSubject) => string;
  needsAgent?: boolean;
  hint?: { body: readonly MessageDescriptor[]; link?: TourLink; when: TourAnchor; afterMs: number };
  wide?: boolean;
  /** The user types in the targets before Next: they stay usable, only the rest is dimmed. */
  form?: boolean;
}

export type TourIcon = 'agent' | 'pipeline' | 'run' | 'trigger' | 'secret' | 'role' | 'users';

/** The page that offers the tour on a first visit, and the step where the tour starts there. */
export interface TourOffer {
  /** The path in the workspace, without its slug. */
  path: RegExp;
  step: string;
  subject?: (match: RegExpMatchArray) => OnboardingSubject;
  /** The page offers the tour only once this element shows. */
  needs?: TourAnchor;
}

export interface TourDefinition {
  id: string;
  icon: TourIcon;
  title: MessageDescriptor;
  summary: MessageDescriptor;
  minutes: number;
  permissions: readonly Permission[];
  finish: { title: MessageDescriptor; body: MessageDescriptor };
  offer?: TourOffer;
  steps: readonly TourSpotStep[];
}

export const JOB_HINT_AFTER_MS = 5000;

const agentPage = ({ agentId }: OnboardingSubject) => (agentId ? `/agents/${agentId}` : '/agents');
const projectPage = ({ projectId }: OnboardingSubject) =>
  projectId ? `/projects/${projectId}` : '/projects';
const pipelineEditorPage = ({ projectId }: OnboardingSubject) =>
  projectId ? `/projects/${projectId}/create` : '/projects';
const projectPart =
  (part: string) =>
  ({ projectId }: OnboardingSubject) =>
    projectId ? `/projects/${projectId}/${part}` : '/projects';

const select =
  (selector: string): TourAnchor =>
  root =>
    root.querySelector(selector);

const navLink = (url: string) => select(`[data-nav-url="${url}"]`);

const either =
  (...anchors: readonly TourAnchor[]): TourAnchor =>
  (root, subject) => {
    for (const anchor of anchors) {
      const element = anchor(root, subject);
      if (element) return element;
    }
    return null;
  };

/** The link of the agents, or its folded group "Machines" until the user opens it. */
const agentsNav = either(navLink('agents'), select('[data-nav-group="machines"]'));

/** The links of Access are shown once the group is open: until then, the group itself. */
const accessNav = (url: string) => either(navLink(url), navLink('members'));

const newButtonOf = (page: string) =>
  select(`[data-tour="${page}"] [data-part="feature-header-new"]`);

const formDialog: TourAnchor = root =>
  [...root.querySelectorAll('[data-slot="dialog-content"]')].find(dialog =>
    dialog.querySelector('form'),
  ) ?? null;

const formSubmit: TourAnchor = (root, subject) =>
  formDialog(root, subject)?.querySelector('button[type="submit"]') ?? null;

const button = (selector: string) => select(`[data-tour="${selector}"] button`);

const agentDialog = select('[data-tour="add-agent-dialog"]');

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
  const run = actions?.querySelector('[data-tour="pipeline-run"]');
  return run?.querySelector('button') ?? run ?? actions;
};

/** The ⚡ button of the pipeline, or its whole actions while they fold into the ⋯ menu. */
const triggersButton: TourAnchor = (root, subject) => {
  const actions = pipelineCell('pipeline-actions')(root, subject);
  return actions?.querySelector('[data-tour="pipeline-triggers"] button') ?? actions;
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

const jobNotStarted: TourAnchor = (root, subject) => {
  const history = pipelineHistory(root, subject);
  const status = history instanceof HTMLElement ? history.dataset.lastStatus : undefined;
  return history && (!status || status === 'pending') ? history : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const lastDialog: TourAnchor = root => {
  const dialogs = root.querySelectorAll('[data-slot="dialog-content"]');
  return dialogs.length ? dialogs[dialogs.length - 1] : null;
};

/** The grid of the project cards: the user may pick any of them. */
const projectCards: TourAnchor = root =>
  root.querySelector('[data-tour="project-card"]')?.parentElement ?? null;

/** Opens the page of a project, or moves on at once when the user is on one already. */
const pickProject = (id: string, body: MessageDescriptor): TourSpotStep => ({
  id,
  page: projectPage,
  title: m.pickProjectTitle,
  body: [body],
  targets: [projectCards],
  advance: {
    on: 'appear',
    anchor: select('[data-tour="pipelines"][data-project-id]'),
    found: element =>
      element instanceof HTMLElement && element.dataset.projectId
        ? { projectId: element.dataset.projectId }
        : undefined,
  },
});

const createdProject: TourAnchor = (root, subject) =>
  subject.projectId
    ? root.querySelector(`[data-tour="project-card"][data-project-id="${subject.projectId}"]`)
    : root.querySelector('[data-tour="project-card"]');

const createdProjectPage: TourAnchor = (root, subject) =>
  subject.projectId
    ? root.querySelector(`[data-tour="pipelines"][data-project-id="${subject.projectId}"]`)
    : root.querySelector('[data-tour="pipelines"]');

const docs = (label: MessageDescriptor): TourLink => ({ label, href: SCYLLA_DOCS_URL });

const agentTour: TourDefinition = {
  id: 'agent',
  icon: 'agent',
  title: m.agentTour,
  summary: m.agentTourSummary,
  minutes: 3,
  permissions: [Permission.CREATE_AGENT],
  finish: { title: m.agentFinishTitle, body: m.agentFinishBody },
  offer: { path: /^\/agents\/?$/, step: 'new-agent' },
  steps: [
    {
      id: 'open-agents',
      title: m.openAgentsTitle,
      body: [m.openAgentsBody],
      targets: [agentsNav],
      advance: { on: 'click', anchor: navLink('agents') },
    },
    {
      id: 'new-agent',
      page: () => '/agents',
      title: m.newAgentTitle,
      body: [m.newAgentBody],
      targets: [newButtonOf('agents')],
      action: { anchor: newButtonOf('agents') },
      advance: { on: 'click', anchor: newButtonOf('agents') },
      fallback: 'open-agents',
    },
    {
      id: 'create-agent',
      page: () => '/agents',
      title: m.createAgentTitle,
      body: [m.createAgentBody],
      targets: [formDialog],
      action: { anchor: formSubmit },
      advance: { on: 'appear', anchor: select('[data-tour="app-join-code"]') },
      fallback: 'new-agent',
    },
    {
      id: 'run-command',
      page: () => '/agents',
      title: m.runCommandTitle,
      body: [m.runCommandBody],
      link: docs(m.installDocs),
      waiting: m.runCommandWaiting,
      targets: [agentDialog],
      action: {
        anchor: select('[data-tour="agent-open"]'),
        label: m.agentAction,
        ready: { title: m.agentOnlineTitle, body: [m.agentOnlineBody] },
      },
      advance: { on: 'click', anchor: select('[data-tour="agent-open"]') },
      fallback: 'new-agent',
    },
    {
      id: 'agent-page',
      page: agentPage,
      title: m.agentPageTitle,
      body: [m.agentPageBody],
      link: docs(m.agentsDocs),
      targets: [select('[data-tour="agent-details"]')],
      advance: { on: 'next' },
    },
  ],
};

const pipelineTour: TourDefinition = {
  id: 'pipeline',
  icon: 'pipeline',
  title: m.pipelineTour,
  summary: m.pipelineTourSummary,
  minutes: 2,
  permissions: [Permission.CREATE_PROJECT],
  finish: { title: m.pipelineFinishTitle, body: m.pipelineFinishBody },
  offer: { path: /^\/projects\/?$/, step: 'new-project' },
  steps: [
    {
      id: 'open-projects',
      title: m.openProjectsTitle,
      body: [m.openProjectsBody],
      targets: [navLink('projects')],
      advance: { on: 'click', anchor: navLink('projects') },
    },
    {
      id: 'new-project',
      page: () => '/projects',
      title: m.newProjectTitle,
      body: [m.newProjectBody],
      targets: [newButtonOf('projects')],
      action: { anchor: newButtonOf('projects') },
      advance: { on: 'click', anchor: newButtonOf('projects') },
      fallback: 'open-projects',
    },
    {
      id: 'create-project',
      page: () => '/projects',
      title: m.createProjectTitle,
      body: [m.createProjectBody],
      targets: [formDialog],
      action: { anchor: formSubmit },
      advance: {
        on: 'mutation',
        key: CREATE_PROJECT_MUTATION_KEY,
        onSuccess: data =>
          isRecord(data) && typeof data.id === 'string' ? { projectId: data.id } : undefined,
      },
      fallback: 'new-project',
    },
    {
      id: 'open-project',
      page: () => '/projects',
      title: m.openProjectTitle,
      body: [m.openProjectBody],
      targets: [createdProject],
      advance: { on: 'appear', anchor: createdProjectPage },
    },
    {
      id: 'new-pipeline',
      page: projectPage,
      title: m.newPipelineTitle,
      body: [m.newPipelineBody],
      targets: [newButtonOf('pipelines')],
      action: { anchor: newButtonOf('pipelines') },
      advance: { on: 'click', anchor: newButtonOf('pipelines') },
    },
    {
      id: 'create-pipeline',
      page: pipelineEditorPage,
      title: m.createPipelineTitle,
      body: [m.createPipelineBody],
      link: docs(m.pipelinesDocs),
      targets: [select('[data-tour="pipeline-submit"]'), select('[data-tour="pipeline-editor"]')],
      action: { anchor: select('[data-tour="pipeline-submit"]') },
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
  ],
};

const runTour: TourDefinition = {
  id: 'run',
  icon: 'run',
  title: m.runTour,
  summary: m.runTourSummary,
  minutes: 1,
  permissions: [],
  finish: { title: m.runFinishTitle, body: m.runFinishBody },
  offer: {
    path: /^\/projects\/([^/]+)\/?$/,
    step: 'run-pipeline',
    subject: ([, projectId]) => (projectId ? { projectId } : {}),
    needs: select('[data-tour="pipeline-actions"]'),
  },
  steps: [
    pickProject('run-project', m.pickProjectRunBody),
    {
      id: 'run-pipeline',
      needsAgent: true,
      page: projectPage,
      title: m.runPipelineTitle,
      body: [m.runPipelineBody],
      targets: [runButton],
      action: { anchor: runButton, label: m.runAction },
      advance: {
        on: 'mutation',
        key: RUN_PIPELINE_MUTATION_KEY,
        onSuccess: (_data, variables) =>
          typeof variables === 'string' ? { pipelineId: variables } : undefined,
      },
    },
    {
      id: 'wait-job',
      page: projectPage,
      title: m.waitJobTitle,
      body: [m.waitJobBody],
      waiting: m.waitJobWaiting,
      hint: {
        body: [m.waitJobAgentHint],
        link: docs(m.waitJobDocs),
        when: jobNotStarted,
        afterMs: JOB_HINT_AFTER_MS,
      },
      needsAgent: true,
      targets: [pipelineRow],
      advance: { on: 'next' },
      nextWhen: { on: 'appear', anchor: finishedRun },
    },
    {
      id: 'open-job',
      page: projectPage,
      title: m.openJobTitle,
      body: [m.openJobBody],
      targets: [lastRun],
      advance: { on: 'appear', anchor: select('[data-tour="job-details"]') },
    },
    {
      id: 'job-details',
      page: projectPage,
      title: m.jobDetailsTitle,
      body: [m.jobDetailsBody],
      link: docs(m.jobsDocs),
      targets: [select('[data-tour="job-details"]')],
      advance: { on: 'next' },
      fallback: 'open-job',
    },
  ],
};

const triggersTour: TourDefinition = {
  id: 'triggers',
  icon: 'trigger',
  title: m.triggersTour,
  summary: m.triggersTourSummary,
  minutes: 2,
  permissions: [],
  finish: { title: m.otherFinishTitle, body: m.otherFinishBody },
  offer: {
    path: /^\/projects\/([^/]+)\/pipelines\/([^/]+)\/triggers\/?$/,
    step: 'new-trigger',
    subject: ([, projectId, pipelineId]) =>
      projectId && pipelineId ? { projectId, pipelineId } : {},
  },
  steps: [
    pickProject('triggers-project', m.pickProjectTriggersBody),
    {
      id: 'open-triggers',
      page: projectPage,
      title: m.openTriggersTitle,
      body: [m.openTriggersBody],
      targets: [triggersButton],
      action: { anchor: triggersButton },
      advance: { on: 'appear', anchor: select('[data-tour="triggers"]') },
    },
    {
      id: 'new-trigger',
      title: m.newTriggerTitle,
      body: [m.newTriggerBody],
      targets: [newButtonOf('triggers')],
      action: { anchor: newButtonOf('triggers') },
      advance: { on: 'click', anchor: newButtonOf('triggers') },
      fallback: 'open-triggers',
    },
    {
      id: 'trigger-kind',
      title: m.triggerKindTitle,
      body: [m.triggerKindBody],
      link: docs(m.triggersDocs),
      targets: [select('[data-tour="trigger-general"]')],
      advance: { on: 'next' },
      form: true,
      fallback: 'new-trigger',
    },
    {
      id: 'trigger-when',
      title: m.triggerWhenTitle,
      body: [m.triggerWhenBody],
      targets: [select('[data-tour="trigger-when"]'), button('trigger-submit')],
      action: { anchor: button('trigger-submit') },
      advance: { on: 'mutation', key: CREATE_TRIGGER_MUTATION_KEY },
      fallback: 'new-trigger',
    },
    {
      id: 'trigger-done',
      title: m.triggerDoneTitle,
      body: [m.triggerDoneBody],
      targets: [select('[data-tour="triggers"] tbody tr')],
      advance: { on: 'next' },
    },
  ],
};

const secretsTour: TourDefinition = {
  id: 'secrets',
  icon: 'secret',
  title: m.secretsTour,
  summary: m.secretsTourSummary,
  minutes: 1,
  permissions: [],
  finish: { title: m.otherFinishTitle, body: m.otherFinishBody },
  offer: {
    path: /^\/projects\/([^/]+)\/secrets\/?$/,
    step: 'new-secret',
    subject: ([, projectId]) => (projectId ? { projectId } : {}),
  },
  steps: [
    pickProject('secrets-project', m.pickProjectSecretsBody),
    {
      id: 'open-secrets',
      page: projectPage,
      title: m.openSecretsTitle,
      body: [m.openSecretsBody],
      targets: [navLink('secrets')],
      advance: { on: 'click', anchor: navLink('secrets') },
    },
    {
      id: 'new-secret',
      page: projectPart('secrets'),
      title: m.newSecretTitle,
      body: [m.newSecretBody],
      targets: [newButtonOf('secrets')],
      action: { anchor: newButtonOf('secrets') },
      advance: { on: 'click', anchor: newButtonOf('secrets') },
      fallback: 'open-secrets',
    },
    {
      id: 'secret-value',
      page: projectPart('secrets'),
      title: m.secretValueTitle,
      body: [m.secretValueBody],
      link: docs(m.secretsDocs),
      targets: [formDialog],
      action: { anchor: formSubmit },
      advance: { on: 'mutation', key: CREATE_SECRET_MUTATION_KEY },
      fallback: 'new-secret',
    },
    {
      id: 'use-secret',
      page: projectPart('secrets'),
      title: m.useSecretTitle,
      body: [m.useSecretBody],
      link: docs(m.secretsDocs),
      targets: [select('[data-tour="secrets"] tbody tr')],
      advance: { on: 'next' },
    },
  ],
};

const rolesTour: TourDefinition = {
  id: 'roles',
  icon: 'role',
  title: m.rolesTour,
  summary: m.rolesTourSummary,
  minutes: 2,
  permissions: [Permission.MANAGE_WORKSPACE_ROLES],
  finish: { title: m.otherFinishTitle, body: m.otherFinishBody },
  offer: { path: /^\/access\/roles\/?$/, step: 'built-in-roles' },
  steps: [
    {
      id: 'open-roles',
      title: m.openRolesTitle,
      body: [m.openRolesBody],
      targets: [accessNav('roles')],
      advance: { on: 'click', anchor: navLink('roles') },
    },
    {
      id: 'built-in-roles',
      page: () => '/access/roles',
      title: m.builtInRolesTitle,
      body: [m.builtInRolesBody],
      targets: [select('[data-tour="roles-list"]')],
      advance: { on: 'next' },
      fallback: 'open-roles',
    },
    {
      id: 'new-role',
      page: () => '/access/roles',
      title: m.newRoleTitle,
      body: [m.newRoleBody],
      targets: [button('role-new')],
      action: { anchor: button('role-new') },
      advance: { on: 'click', anchor: button('role-new') },
      fallback: 'open-roles',
    },
    {
      id: 'role-details',
      page: () => '/access/roles/new',
      title: m.roleDetailsTitle,
      body: [m.roleDetailsBody],
      link: docs(m.rolesDocs),
      targets: [select('[data-tour="role-details"]')],
      advance: { on: 'next' },
      form: true,
      fallback: 'new-role',
    },
    {
      id: 'role-permissions',
      page: () => '/access/roles/new',
      title: m.rolePermissionsTitle,
      body: [m.rolePermissionsBody],
      targets: [select('[data-tour="role-permissions"]'), button('role-submit')],
      action: { anchor: button('role-submit') },
      advance: { on: 'mutation', key: CREATE_ROLE_MUTATION_KEY },
      fallback: 'new-role',
      wide: true,
    },
  ],
};

const usersTour: TourDefinition = {
  id: 'users',
  icon: 'users',
  title: m.usersTour,
  summary: m.usersTourSummary,
  minutes: 1,
  permissions: [Permission.MANAGE_WORKSPACE_GRANTS],
  finish: { title: m.otherFinishTitle, body: m.otherFinishBody },
  offer: { path: /^\/access\/members\/?$/, step: 'add-members' },
  steps: [
    {
      id: 'open-members',
      title: m.openMembersTitle,
      body: [m.openMembersBody],
      targets: [navLink('members')],
      advance: { on: 'appear', anchor: select('[data-tour="members"]') },
    },
    {
      id: 'add-members',
      page: () => '/access/members',
      title: m.addMembersTitle,
      body: [m.addMembersBody],
      targets: [button('members-add')],
      action: { anchor: button('members-add') },
      advance: { on: 'click', anchor: button('members-add') },
      fallback: 'open-members',
    },
    {
      id: 'people-role',
      page: () => '/access/members',
      title: m.peopleRoleTitle,
      body: [m.peopleRoleBody],
      link: docs(m.rolesDocs),
      targets: [lastDialog],
      action: { anchor: button('members-submit') },
      advance: { on: 'click', anchor: button('members-submit') },
      fallback: 'add-members',
    },
    {
      id: 'members-list',
      page: () => '/access/members',
      title: m.membersListTitle,
      body: [m.membersListBody],
      targets: [select('[data-tour="members"]')],
      advance: { on: 'next' },
    },
  ],
};

export const TOURS: readonly TourDefinition[] = [
  agentTour,
  pipelineTour,
  runTour,
  triggersTour,
  secretsTour,
  rolesTour,
  usersTour,
];

/** The tours that the welcome dialog offers, in their order: the first one is recommended. */
export const MAIN_TOUR_IDS: readonly string[] = ['agent', 'pipeline', 'run'];

export const findTour = (id: string | undefined): TourDefinition | undefined =>
  TOURS.find(tour => tour.id === id);

export const tourOfStep = (stepId: string | null): TourDefinition | undefined =>
  stepId === null ? undefined : TOURS.find(tour => tour.steps.some(step => step.id === stepId));
