import { createMutation } from '@scylla/core-sdk';
import type { AccountDataExport } from '@base/features/user/domain/entities/user.entity.ts';
import { dataExportFile } from '@base/features/user/presentation/presenters/data-export.presenter.ts';
import { userMutations } from '@base/features/user/presentation/user.queries.ts';

/** `none` before the first export of the page, then the state of the last one. */
export type DataExportStatus = 'none' | 'preparing' | 'ready' | 'failed';

/** Gives a copy to the browser as a file to save. */
const save = (copy: AccountDataExport): void => {
  const url = URL.createObjectURL(new Blob([copy.json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = dataExportFile(copy).name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/**
 * The export of the data of the own account: one call to the server, then the file goes to the
 * browser. The copy stays in the page only, for a second download: the cache does not keep it.
 */
export const createDataExport = () => {
  const exportation = createMutation(() => userMutations.exportAccountData());

  const status: DataExportStatus = $derived(
    exportation.isPending
      ? 'preparing'
      : exportation.isError
        ? 'failed'
        : exportation.data
          ? 'ready'
          : 'none',
  );
  const copy = $derived(exportation.data);
  const file = $derived(copy && dataExportFile(copy));

  return {
    get status() {
      return status;
    },
    /** The name and the size of the file of the last copy. */
    get file() {
      return file;
    },
    get exportedAt() {
      return copy?.exportedAt;
    },
    /** Asks the server for a new copy, and saves it when it comes. */
    start: () => exportation.mutate(undefined, { onSuccess: save }),
    /** Saves the last copy again. */
    download: () => {
      if (copy) save(copy);
    },
  };
};

export type DataExport = ReturnType<typeof createDataExport>;
