import { createQuery } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { copyToClipboard } from '@scylla/ui/utils';
import type { PipelineFileFormat } from '@base/features/pipeline/domain/structs/pipeline-file-format.struct.ts';
import { exportMessages } from '@base/features/pipeline/presentation/messages/export.messages.ts';
import { pipelineQueries } from '@base/features/pipeline/presentation/pipeline.queries.ts';

const MEDIA_TYPES: Record<PipelineFileFormat, string> = {
  toml: 'application/toml',
  yaml: 'application/yaml',
  json: 'application/json',
};

interface ExportPipelineOptions {
  pipelineId: () => string;
  /** The file is read only while the dialog is open. */
  open: () => boolean;
}

/** The file of the export dialog: the format the user picks, the file of the server, copy and download. */
export const createExportPipeline = (options: ExportPipelineOptions) => {
  let format = $state<PipelineFileFormat>('toml');

  const fileQuery = createQuery(() => ({
    ...pipelineQueries.fileExport(options.pipelineId(), format),
    enabled: options.open() && !!options.pipelineId(),
  }));

  const file = $derived(fileQuery.data);

  return {
    get format() {
      return format;
    },
    setFormat(next: PipelineFileFormat) {
      format = next;
    },
    get file() {
      return file;
    },
    /** A failed read with no file to show: a failed refetch keeps the file. */
    get failed() {
      return !file && fileQuery.isError;
    },
    retry() {
      void fileQuery.refetch();
    },
    async copy() {
      if (file) await copyToClipboard(file.content, { copied: t(exportMessages.copied) });
    },
    download() {
      if (!file) return;
      const url = URL.createObjectURL(new Blob([file.content], { type: MEDIA_TYPES[format] }));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.path.slice(file.path.lastIndexOf('/') + 1);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
  };
};

export type ExportPipeline = ReturnType<typeof createExportPipeline>;
