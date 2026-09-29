import { describe, it, expect, afterEach } from 'vitest';
import { TOUR_STEPS, type TourAnchor, type TourSpotStep } from '../tour-steps.ts';

const spot = (id: string) => {
  const step = TOUR_STEPS.find(candidate => candidate.id === id);
  if (step?.kind !== 'spot') throw new Error(`no spot step ${id}`);
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

describe('TOUR_STEPS', () => {
  it('opens with the welcome and ends with the final screen', () => {
    expect(TOUR_STEPS[0].kind).toBe('welcome');
    expect(TOUR_STEPS.at(-1)?.kind).toBe('finish');
    expect(TOUR_STEPS.filter(step => step.kind === 'spot')).toHaveLength(21);
  });

  it('gives each step a unique id and falls back only to a known step', () => {
    const ids = TOUR_STEPS.map(step => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const step of TOUR_STEPS) {
      if (step.kind === 'spot' && step.fallback) expect(ids).toContain(step.fallback);
    }
  });

  it('shows a Next button only on the steps that the user does not finish with a click', () => {
    const withNext = TOUR_STEPS.filter(
      step => step.kind === 'spot' && (step.advance.on === 'next' || step.nextWhen),
    ).map(step => step.id);

    expect(withNext).toEqual([
      'dashboard',
      'navbar',
      'copy-secret',
      'agent-page',
      'connect-agent',
      'pipeline-editor',
      'wait-job',
      'job-details',
    ]);
  });
});

describe('the anchors of the pipeline steps', () => {
  it('point at the run button of the pipeline the tour created', () => {
    pipelineRows([
      { id: 'old', name: 'legacy' },
      { id: 'new', name: 'my-pipeline' },
    ]);

    const [runButton] = spot('run-pipeline').targets;

    expect(runButton(document, { pipelineName: 'my-pipeline' })?.querySelector('button')?.id).toBe(
      'run-new',
    );
    expect(runButton(document, {})?.querySelector('button')?.id).toBe('run-old');
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

describe('the step that waits for the agent', () => {
  it('enables Next once the agent is online, and never moves on by itself', () => {
    const step = spot('connect-agent');
    const online = conditionOf(step);

    expect(step.advance.on).toBe('next');
    document.body.innerHTML = '<div data-tour="agent-status" data-online="false"></div>';
    expect(online(document, {})).toBeNull();

    document.body.innerHTML = '<div data-tour="agent-status" data-online="true"></div>';
    expect(online(document, {})).not.toBeNull();
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
    const withoutPage = TOUR_STEPS.filter(step => step.kind === 'spot' && !step.page).map(
      step => step.id,
    );

    expect(withoutPage).toEqual(['open-agents', 'open-projects']);
  });

  it('leads back to the agent and the project the tour created', () => {
    const subject = { agentId: 'a-1', projectId: 'p-1' };

    expect(spot('connect-agent').page?.(subject)).toBe('/agents/a-1');
    expect(spot('pipeline-editor').page?.(subject)).toBe('/projects/p-1/create');
    expect(spot('wait-job').page?.(subject)).toBe('/projects/p-1');
    expect(spot('wait-job').page?.({})).toBe('/projects');
  });

  it('sends a job page that is gone back to the step that opens it', () => {
    expect(spot('job-details').fallback).toBe('open-job');
  });
});

describe('the steps that depend on the agent', () => {
  it('are the run and the wait for the job', () => {
    expect(
      TOUR_STEPS.filter(step => step.kind === 'spot' && step.needsAgent).map(step => step.id),
    ).toEqual(['run-pipeline', 'wait-job']);
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
    const links = TOUR_STEPS.flatMap(step =>
      step.kind === 'spot'
        ? [step.link, step.note?.link, step.hint?.link].filter(link => !!link)
        : [],
    );

    expect(links.length).toBeGreaterThan(0);
    expect(links.every(link => link?.href === 'https://prelude.scylla-ops.com')).toBe(true);
  });
});

describe('the anchors of the dialog steps', () => {
  it('point at the dialog that holds a form, not at another dialog', () => {
    document.body.innerHTML = `
      <div data-slot="dialog-content" id="other"><p>hello</p></div>
      <div data-slot="dialog-content" id="create"><form></form></div>`;

    const [dialog] = spot('create-agent').targets;

    expect(dialog(document, {})?.id).toBe('create');
  });

  it('move on once the secret is revealed', () => {
    const revealed = conditionOf(spot('reveal-secret'));

    document.body.innerHTML = '<div data-part="secret-reveal-secret" data-state="hidden"></div>';
    expect(revealed(document, {})).toBeNull();

    document.body.innerHTML = '<div data-part="secret-reveal-secret" data-state="revealed"></div>';
    expect(revealed(document, {})).not.toBeNull();
  });
});
