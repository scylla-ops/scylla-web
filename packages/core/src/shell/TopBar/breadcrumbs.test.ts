// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { TrailCrumb } from '@scylla/core-sdk';
import { breadcrumbsFor } from './breadcrumbs.ts';

const translate = (message: { id: string; message?: string }) =>
  `t:${message.message ?? message.id}`;

describe('breadcrumbsFor', () => {
  it('shows a text label as it is', () => {
    const trail: TrailCrumb[] = [
      { breadcrumb: ({ workspaceName }) => ({ label: workspaceName ?? '' }), pathname: '/acme' },
    ];

    expect(breadcrumbsFor(trail, { workspaceName: 'acme' }, translate)).toEqual([
      { label: 'acme', pathname: '/acme' },
    ]);
  });

  it('translates the label and the detail, and keeps the highlight as it is', () => {
    const trail: TrailCrumb[] = [
      {
        breadcrumb: ({ pipelineName }) => ({
          label: { id: 'Pipeline' },
          highlight: pipelineName,
          detail: { id: 'Jobs' },
        }),
        pathname: '/acme/projects/p1/pipelines/pl1/jobs',
      },
    ];

    expect(breadcrumbsFor(trail, { pipelineName: 'Nightly' }, translate)).toEqual([
      {
        label: 't:Pipeline',
        highlight: 'Nightly',
        detail: 't:Jobs',
        pathname: '/acme/projects/p1/pipelines/pl1/jobs',
      },
    ]);
  });
});
