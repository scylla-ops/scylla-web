import { describe, it, expect, afterEach } from 'vitest';
import {
  MAIN_TOUR_IDS,
  TOURS,
  tourOfStep,
  type TourAnchor,
  type TourSpotStep,
} from './tour-steps.registry.ts';

const ALL_STEPS = TOURS.flatMap(tour => tour.steps);

const spot = (id: string) => {
  const step = ALL_STEPS.find(candidate => candidate.id === id);
  if (!step) throw new Error(`no step ${id}`);
  return step;
};

const conditionOf = (step: TourSpotStep): TourAnchor => {
  const condition = step.nextWhen ?? step.advance;
  if (!('anchor' in condition)) throw new Error(`step ${step.id} waits for no element`);
  return condition.anchor;
};

const pipelineRows = (rows: { id: string; name: string; status?: string; runs?: string[] }[]) => {
  document.body.innerHTML = `<table><tbody>${rows
    .map(
      row => `<tr id="row-${row.id}">
        <td><div data-tour="pipeline-history" data-pipeline-id="${row.id}" data-pipeline-name="${row.name}" ${row.status ? `data-last-status="${row.status}"` : ''}>
          ${(row.runs ?? []).map(run => `<button data-item-id="${run}"></button>`).join('')}
        </div></td>
        <td><div data-tour="pipeline-actions" data-pipeline-id="${row.id}" data-pipeline-name="${row.name}">
          <span data-tour="pipeline-run" class="contents"><button id="run-${row.id}"></button></span>
        </div></td>
      </tr>`,
    )
    .join('')}</tbody></table>`;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('TOURS', () => {
  it('splits the onboarding into short tours of six steps at most', () => {
    expect(TOURS.map(tour => [tour.id, tour.steps.length])).toEqual([
      ['agent', 5],
      ['pipeline', 6],
      ['run', 5],
      ['triggers', 6],
      ['secrets', 5],
      ['roles', 5],
      ['users', 4],
    ]);
    expect(MAIN_TOUR_IDS).toEqual(['agent', 'pipeline', 'run']);
  });

  it('gives each step a unique id and falls back only to a step of its own tour', () => {
    const ids = ALL_STEPS.map(step => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tour of TOURS) {
      const own = tour.steps.map(step => step.id);
      for (const step of tour.steps) {
        if (typeof step.fallback === 'string') expect(own).toContain(step.fallback);
        if (typeof step.fallback === 'function') {
          expect(own).toContain(step.fallback({}));
          expect(own).toContain(step.fallback({ agentId: 'a-1' }));
        }
      }
    }
  });

  it('finds the tour that holds a step', () => {
    expect(tourOfStep('wait-job')?.id).toBe('run');
    expect(tourOfStep('unknown')).toBeUndefined();
  });

  it('repeats a button of the page on the card only where the user clicks a button', () => {
    const withAction = ALL_STEPS.filter(step => step.action).map(step => step.id);

    expect(withAction).toEqual([
      'new-agent',
      'create-agent',
      'run-command',
      'new-project',
      'create-project',
      'new-pipeline',
      'create-pipeline',
      'run-pipeline',
      'open-triggers',
      'new-trigger',
      'trigger-when',
      'new-secret',
      'secret-value',
      'new-role',
      'role-permissions',
      'add-members',
      'people-role',
    ]);
  });

  it('labels the button of the agent step “Agent”, and enables it once the agent is online', () => {
    const { action } = spot('run-command');

    expect(action?.label?.message).toBe('Agent');
    document.body.innerHTML = '<div data-tour="add-agent-page"></div>';
    expect(action?.anchor(document, {})).toBeNull();
    document.body.innerHTML = '<button data-tour="agent-open" id="open"></button>';
    expect(action?.anchor(document, {})?.id).toBe('open');
  });
});

describe('the anchors of the pipeline steps', () => {
  it('point at the run button of the pipeline the tour created', () => {
    pipelineRows([
      { id: 'old', name: 'legacy' },
      { id: 'new', name: 'my-pipeline' },
    ]);

    const [runButton] = spot('run-pipeline').targets;

    expect(runButton(document, { pipelineName: 'my-pipeline' })?.id).toBe('run-new');
    expect(runButton(document, {})?.id).toBe('run-old');
  });

  it('spotlight the whole row of the run pipeline', () => {
    pipelineRows([
      { id: 'old', name: 'legacy' },
      { id: 'new', name: 'my-pipeline' },
    ]);

    const [row] = spot('wait-job').targets;

    expect(row(document, { pipelineId: 'new' })?.id).toBe('row-new');
  });

  it('unlock the wait step only once the last job is over', () => {
    const finished = conditionOf(spot('wait-job'));

    pipelineRows([{ id: 'p', name: 'ci', status: 'running' }]);
    expect(finished(document, { pipelineId: 'p' })).toBeNull();

    pipelineRows([{ id: 'p', name: 'ci' }]);
    expect(finished(document, { pipelineId: 'p' })).toBeNull();

    pipelineRows([{ id: 'p', name: 'ci', status: 'completed' }]);
    expect(finished(document, { pipelineId: 'p' })).not.toBeNull();
  });

  it('point at the newest run, the last square of the history', () => {
    pipelineRows([{ id: 'p', name: 'ci', status: 'completed', runs: ['job-1', 'job-2'] }]);

    const [lastRun] = spot('open-job').targets;

    expect(lastRun(document, { pipelineId: 'p' })?.getAttribute('data-item-id')).toBe('job-2');
  });
});

describe('the anchors of the project steps', () => {
  const projects = () => {
    document.body.innerHTML = `
      <div data-tour="project-card" data-project-id="old" id="card-old"></div>
      <div data-tour="project-card" data-project-id="new" id="card-new"></div>`;
  };

  it('point at the card of the project the user just created', () => {
    projects();

    const [card] = spot('open-project').targets;

    expect(card(document, { projectId: 'new' })?.id).toBe('card-new');
  });

  it('move on only once the page of that project is open', () => {
    const opened = conditionOf(spot('open-project'));

    document.body.innerHTML = '<div data-tour="pipelines" data-project-id="old"></div>';
    expect(opened(document, { projectId: 'new' })).toBeNull();

    document.body.innerHTML = '<div data-tour="pipelines" data-project-id="new"></div>';
    expect(opened(document, { projectId: 'new' })).not.toBeNull();
  });

  it('remember the project the mutation created, without opening it', () => {
    const step = spot('create-project');
    if (step.advance.on !== 'mutation') throw new Error('create-project waits for a mutation');

    expect(step.advance.onSuccess?.({ id: 'new', name: 'web' }, {})).toEqual({ projectId: 'new' });
  });
});

describe('the way back from another page', () => {
  it('knows the page of every step that the user reaches from somewhere else', () => {
    const withoutPage = TOURS.map(tour => tour.steps.slice(1).filter(step => !step.page))
      .flat()
      .map(step => step.id);

    expect(withoutPage).toEqual(['new-trigger', 'trigger-kind', 'trigger-when', 'trigger-done']);
  });

  it('leads back to the agent and the project the tour created', () => {
    const subject = { agentId: 'a-1', projectId: 'p-1' };

    expect(spot('agent-page').page?.(subject)).toBe('/agents/a-1');
    expect(spot('run-command').page?.(subject)).toBe('/agents/a-1/connect');
    expect(spot('run-command').page?.({})).toBe('/agents/new');
    expect(spot('create-pipeline').page?.(subject)).toBe('/projects/p-1/create');
    expect(spot('new-secret').page?.(subject)).toBe('/projects/p-1/secrets');
    expect(spot('wait-job').page?.(subject)).toBe('/projects/p-1');
    expect(spot('wait-job').page?.({})).toBe('/projects');
  });

  it('sends a job page that is gone back to the step that opens it', () => {
    expect(spot('job-details').fallback).toBe('open-job');
  });
});

describe('the steps that depend on the agent', () => {
  it('are the run and the wait for the job', () => {
    expect(ALL_STEPS.filter(step => step.needsAgent).map(step => step.id)).toEqual([
      'run-pipeline',
      'wait-job',
    ]);
  });
});

describe('the hint of the wait step', () => {
  it('shows after 5 s while the last job has not started, and never once it runs', () => {
    const hint = spot('wait-job').hint;
    if (!hint) throw new Error('wait-job has no hint');
    expect(hint.afterMs).toBe(5000);

    pipelineRows([{ id: 'p', name: 'ci' }]);
    expect(hint.when(document, { pipelineId: 'p' })).not.toBeNull();

    pipelineRows([{ id: 'p', name: 'ci', status: 'pending' }]);
    expect(hint.when(document, { pipelineId: 'p' })).not.toBeNull();

    pipelineRows([{ id: 'p', name: 'ci', status: 'running' }]);
    expect(hint.when(document, { pipelineId: 'p' })).toBeNull();
  });
});

describe('the documentation links', () => {
  it('all lead to the Scylla documentation', () => {
    const links = ALL_STEPS.flatMap(step => [step.link, step.hint?.link].filter(link => !!link));

    expect(links.length).toBeGreaterThan(0);
    expect(links.every(link => link?.href === 'https://scylla-ops.com/docs')).toBe(true);
  });
});

describe('the steps with a form', () => {
  it('are the ones where the user types before Next', () => {
    expect(ALL_STEPS.filter(step => step.form).map(step => step.id)).toEqual([
      'trigger-kind',
      'role-details',
    ]);
  });
});

describe('the step that picks a project', () => {
  it('moves on with the project whose page is open', () => {
    const { advance } = spot('secrets-project');
    if (advance.on !== 'appear') throw new Error('secrets-project waits for a page');

    document.body.innerHTML = '<div data-tour="pipelines" data-project-id="p-9"></div>';
    const page = advance.anchor(document, {});

    expect(page).not.toBeNull();
    expect(advance.found?.(page as Element)).toEqual({ projectId: 'p-9' });
  });
});

describe('the anchors of the dialog steps', () => {
  it('point at the dialog that holds a form, not at another dialog', () => {
    document.body.innerHTML = `
      <div data-slot="dialog-content" id="other"><p>hello</p></div>
      <div data-slot="dialog-content" id="create"><form></form></div>`;

    const [dialog] = spot('create-project').targets;

    expect(dialog(document, {})?.id).toBe('create');
  });

  it('repeat the submit button of the form dialog', () => {
    document.body.innerHTML = `
      <div data-slot="dialog-content"><p>hello</p></div>
      <div data-slot="dialog-content"><form></form><button type="submit" id="add"></button></div>`;

    expect(spot('create-project').action?.anchor(document, {})?.id).toBe('add');
  });

  it('hold the dialogs of the steps that live in one, with a way back when the dialog is gone', () => {
    const held = ALL_STEPS.filter(step => step.holdsDialog);

    expect(held.map(step => step.id)).toEqual(['create-project', 'secret-value', 'people-role']);
    for (const step of held) expect(step.fallback).toBeDefined();
  });

  it('keep the user away from a join code that cannot come back', () => {
    expect(ALL_STEPS.filter(step => step.noPrevious).map(step => step.id)).toEqual([
      'run-command',
      'agent-page',
    ]);
  });

  it('send a reload of the install step to the agent that exists, not to a second agent', () => {
    const { fallback } = spot('run-command');
    if (typeof fallback !== 'function') throw new Error('no fallback function');

    expect(fallback({ agentId: 'a-1' })).toBe('agent-page');
    expect(fallback({})).toBe('new-agent');
  });

  it('move on from the people step only when its dialog closes, which a failed add does not do', () => {
    const { advance } = spot('people-role');
    if (advance.on !== 'gone') throw new Error('not a gone step');

    document.body.innerHTML = '<div data-slot="dialog-content" id="dialog"></div>';
    expect(advance.anchor(document, {})?.id).toBe('dialog');
  });

  it('points at the folded Machines group until its Agents link shows', () => {
    const [agents] = spot('open-agents').targets;

    document.body.innerHTML = '<button data-nav-group="machines" id="group"></button>';
    expect(agents(document, {})?.id).toBe('group');
    expect(conditionOf(spot('open-agents'))(document, {})).toBeNull();

    document.body.innerHTML = `
      <button data-nav-group="machines" id="group"></button>
      <a data-nav-url="agents" id="link"></a>`;
    expect(agents(document, {})?.id).toBe('link');
    expect(conditionOf(spot('open-agents'))(document, {})?.id).toBe('link');
  });
});

describe('the last step of a tour', () => {
  it.each([
    ['trigger-done', 'triggers'],
    ['use-secret', 'secrets'],
  ])('%s finds a row of the table and a card on a phone', (id, page) => {
    const [row] = spot(id).targets;

    document.body.innerHTML = `<div data-tour="${page}"><div role="rowgroup"><div data-part="data-table-row" id="row"></div></div></div>`;
    expect(row(document, {})?.id).toBe('row');

    document.body.innerHTML = `<div data-tour="${page}"><div data-slot="data-table-card" data-part="data-table-row" id="card"></div></div>`;
    expect(row(document, {})?.id).toBe('card');
  });
});

describe('the buttons that fold into a menu', () => {
  const actions = (inner: string) =>
    `<div data-tour="pipeline-actions" id="actions">${inner}</div>`;

  it.each([
    ['run-pipeline', 'pipeline-run'],
    ['open-triggers', 'pipeline-triggers'],
  ])('%s repeats the real button only, and says so when it folded', (id, part) => {
    const step = spot(id);
    const [target] = step.targets;

    document.body.innerHTML = actions(
      `<span data-tour="${part}"><button id="real"></button></span>`,
    );
    expect(target(document, {})?.id).toBe('real');
    expect(step.action?.anchor(document, {})?.id).toBe('real');

    document.body.innerHTML = actions('<button id="menu"></button>');
    expect(target(document, {})?.id).toBe('actions');
    expect(step.action?.anchor(document, {})).toBeNull();
    expect(step.action?.absent?.body.length).toBe(1);
  });
});

describe('the steps that ask for a name', () => {
  it.each([
    ['trigger-kind', 'trigger-name'],
    ['role-details', 'role-name'],
  ])('%s unlocks Next only with a valid name', (id, field) => {
    const step = spot(id);
    const condition = step.nextWhen;
    if (condition?.on !== 'appear') throw new Error('no condition');

    document.body.innerHTML = `<input id="${field}" />`;
    const input = document.getElementById(field) as HTMLInputElement;
    expect(condition.anchor(document, {})).toBeNull();

    input.value = '   ';
    expect(condition.anchor(document, {})).toBeNull();

    input.value = 'nightly';
    expect(condition.anchor(document, {})).toBe(input);

    input.setAttribute('aria-invalid', 'true');
    expect(condition.anchor(document, {})).toBeNull();
  });
});

describe('the first step on a phone', () => {
  it.each(['open-agents', 'open-projects', 'open-secrets', 'open-roles', 'open-members'])(
    '%s points at the button of the menu while the menu is closed',
    id => {
      const [target] = spot(id).targets;

      document.body.innerHTML = '<button data-sidebar="trigger" id="menu"></button>';
      expect(target(document, {})?.id).toBe('menu');
    },
  );

  it('points at the Access group once the menu is open', () => {
    const [target] = spot('open-roles').targets;

    document.body.innerHTML = `
      <button data-sidebar="trigger" id="menu"></button>
      <button data-nav-group="access" id="group"></button>`;
    expect(target(document, {})?.id).toBe('group');
  });
});

describe('the anchors of the page of a new agent', () => {
  it('point at its form, and repeat its submit button', () => {
    document.body.innerHTML = `
      <div data-slot="dialog-content"><form><button type="submit" id="other"></button></form></div>
      <form data-tour="add-agent-form" id="form"><button type="submit" id="add"></button></form>`;

    const [form] = spot('create-agent').targets;

    expect(form(document, {})?.id).toBe('form');
    expect(spot('create-agent').action?.anchor(document, {})?.id).toBe('add');
  });

  it('move on once the new agent shows its join code', () => {
    const shown = conditionOf(spot('create-agent'));

    document.body.innerHTML = '<form data-tour="add-agent-form"></form>';
    expect(shown(document, {})).toBeNull();

    document.body.innerHTML = '<div data-tour="app-join-code"><button>Copy</button></div>';
    expect(shown(document, {})).not.toBeNull();
  });

  it('point at the whole page, which stays when the agent comes online', () => {
    document.body.innerHTML = `
      <div data-tour="add-agent-page" id="page">
        <button data-tour="agent-open" id="open"></button>
      </div>`;

    const [page] = spot('run-command').targets;

    expect(page(document, {})?.id).toBe('page');
    expect(conditionOf(spot('run-command'))(document, {})?.id).toBe('open');
  });
});
