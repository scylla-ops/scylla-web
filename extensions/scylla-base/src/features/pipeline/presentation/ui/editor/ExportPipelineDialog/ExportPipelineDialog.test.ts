import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { PipelineFileFormat } from '@base/features/pipeline/domain/structs/pipeline-file-format.struct.ts';
import ExportPipelineDialog from './ExportPipelineDialog.svelte';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast }));

const FILES: Record<PipelineFileFormat, string> = {
  toml: 'version = 1\nname = "nightly"\n',
  yaml: 'version: 1\nname: nightly\n',
  json: '{\n  "version": 1\n}\n',
};

const fileOf = (_id: string, format: PipelineFileFormat) =>
  Promise.resolve({ content: FILES[format], path: `.scylla/pipelines/nightly.${format}` });

let teardown: Array<() => void> = [];
let exportFile: ReturnType<typeof vi.fn>;

const renderDialog = (props: Record<string, unknown> = {}) => {
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ pipeline: { pipelineRepository: { exportFile } } })];
  return render(ExportPipelineDialog, {
    open: true,
    onOpenChange: vi.fn(),
    pipelineId: 'pipeline-1',
    pipelineName: 'nightly',
    ...props,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  exportFile = vi.fn(fileOf);
});

afterEach(() => teardown.forEach(restore => restore()));

describe('ExportPipelineDialog', () => {
  it('shows the TOML file first, with the path where it goes', async () => {
    renderDialog();

    expect(await screen.findByText(/name = "nightly"/)).toBeInTheDocument();
    expect(screen.getByText('.scylla/pipelines/nightly.toml')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Export nightly' })).toBeInTheDocument();
    expect(exportFile).toHaveBeenCalledWith('pipeline-1', 'toml');
  });

  it('reads the file again in the format of the tab', async () => {
    renderDialog();
    await screen.findByText(/name = "nightly"/);

    await userEvent.click(screen.getByRole('tab', { name: 'YAML' }));

    expect(await screen.findByText(/name: nightly/)).toBeInTheDocument();
    expect(screen.getByText('.scylla/pipelines/nightly.yaml')).toBeInTheDocument();
    expect(exportFile).toHaveBeenLastCalledWith('pipeline-1', 'yaml');
  });

  it('copies the text of the file', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderDialog();
    await screen.findByText(/name = "nightly"/);

    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(writeText).toHaveBeenCalledWith(FILES.toml);
    expect(toast.success).toHaveBeenCalledWith('File copied');
  });

  it('downloads the file with the name of its path', async () => {
    const createObjectURL = vi.fn(() => 'blob:file');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderDialog();
    await screen.findByText(/name = "nightly"/);

    await userEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click.mock.contexts[0]).toHaveProperty('download', 'nightly.toml');
    click.mockRestore();
  });

  it('says that the file has the saved version while the editor has changes', async () => {
    renderDialog({ dirty: true });

    expect(
      await screen.findByText(
        'The file has the saved version. Save the pipeline to export your changes.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps Copy and Download off until the file comes, and offers Try again on a failure', async () => {
    exportFile = vi
      .fn()
      .mockRejectedValueOnce(new ScyllaError('down', { code: 'UNAVAILABLE' }))
      .mockImplementation(fileOf);
    renderDialog();

    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText(/name = "nightly"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
  });

  it('reads nothing while it is closed', () => {
    renderDialog({ open: false });

    expect(exportFile).not.toHaveBeenCalled();
  });
});
