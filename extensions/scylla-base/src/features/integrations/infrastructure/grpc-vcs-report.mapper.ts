import {
  ReportState as GrpcReportState,
  type VcsReport as GrpcVcsReport,
} from '@base/generated/scylla/integrations/v1/vcs.ts';
import type { JobReports as GrpcJobReports } from '@base/generated/scylla/integrations/v1/vcs_report_service.ts';
import type {
  JobReports,
  ReportState,
  VcsReport,
} from '@base/features/integrations/domain/entities/vcs-report.entity.ts';
import { idValue, timestampToIsoOpt } from '@shared/infrastructure/grpc/wrappers.ts';
import { knownProvider } from './grpc-vcs-connection.mapper.ts';
import { reportModeToDomain } from './grpc-repository-link.mapper.ts';

const STATES: Partial<Record<GrpcReportState, ReportState>> = {
  [GrpcReportState.SENDING]: 'sending',
  [GrpcReportState.SENT]: 'sent',
  [GrpcReportState.RETRYING]: 'retrying',
  [GrpcReportState.NOT_SENT]: 'not_sent',
};

export function toDomain(report: GrpcVcsReport): VcsReport {
  const sentAt = timestampToIsoOpt(report.sentAt);
  const nextAttemptAt = timestampToIsoOpt(report.nextAttemptAt);
  return {
    jobId: idValue(report.jobId),
    provider: knownProvider(report.provider),
    mode: reportModeToDomain(report.mode),
    context: report.context,
    // A state that this build does not know: the report is not known to be sent.
    state: STATES[report.state] ?? 'sending',
    sentState: report.sentState,
    ...(sentAt ? { sentAt } : {}),
    attempts: report.attempts,
    ...(nextAttemptAt ? { nextAttemptAt } : {}),
    error: report.error,
    externalUrl: report.externalUrl,
  };
}

export const jobReportsToDomain = (job: GrpcJobReports): JobReports => ({
  jobId: idValue(job.jobId),
  reports: job.reports.map(toDomain),
  noReportReason: job.noReportReason,
});
