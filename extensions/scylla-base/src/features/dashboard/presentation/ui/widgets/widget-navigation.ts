import { contextStore, scyllaNavigate } from '@platform/context';
import type { JobPlace } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';

/** Opens the page of a job. The dashboard has no project: the job sets it first. */
export const openJob = (place: JobPlace) => {
  if (!place.projectId) return;
  contextStore.getState().setProject(place.projectId, place.projectName);
  scyllaNavigate.goToJobDetails(place.pipelineId, place.jobId, {
    pipelineName: place.pipelineName,
  });
};

/** Opens the jobs of a pipeline. */
export const openPipelineJobs = (pipeline: {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
}) => {
  contextStore.getState().setProject(pipeline.projectId, pipeline.projectName);
  scyllaNavigate.goToJobs(pipeline.id, pipeline.name);
};
