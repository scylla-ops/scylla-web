// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const REPO = join(import.meta.dirname, '../../../../..');

const svelteFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    if (name === 'node_modules') return [];
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? svelteFiles(path)
      : path.endsWith('.svelte')
        ? [path]
        : [];
  });

/** A `<p>` that shows an error with its own markup: it does not slide in and out. */
const OWN_ERROR = /<p\b[^>]*text-destructive/;

/**
 * Pages and panels that show a state of the page (a load error, a dead link, a banner), not
 * the error of a field. A new file is not here: a field error goes through `FieldMessage`.
 */
const NOT_A_FIELD_ERROR = new Set([
  'extensions/scylla-base/src/features/integrations/presentation/ui/Integrations/PageBanner.svelte',
  'extensions/scylla-base/src/features/integrations/presentation/ui/NewGitHubProject/ProjectDetails.svelte',
  'extensions/scylla-base/src/features/invitation/presentation/ui/AcceptInvitation/AcceptInvitation.page.svelte',
  'extensions/scylla-base/src/features/jobs/presentation/ui/jobs-log/JobLogViewer/JobLogViewer.svelte',
  'extensions/scylla-base/src/features/login/presentation/ui/ResendVerification/ResendVerification.svelte',
  'extensions/scylla-base/src/features/login/presentation/ui/ResetPassword/ResetPassword.page.svelte',
  'extensions/scylla-base/src/features/login/presentation/ui/VerifyEmail/VerifyEmail.page.svelte',
  'extensions/scylla-base/src/features/membership/presentation/ui/components/ChangeRolesDialog/RoleChoiceRow.svelte',
  'extensions/scylla-base/src/features/pipeline/presentation/ui/editor/PipelineEditorHeader/PipelineEditorHeader.svelte',
  'extensions/scylla-base/src/features/pipeline/presentation/ui/editor/scripting/DocumentView.svelte',
  'extensions/scylla-base/src/features/pipeline/presentation/ui/file/FilePipeline/FileNotice.svelte',
  'extensions/scylla-base/src/features/pipeline/presentation/ui/library/FragmentDetail/UpstreamUpdateCard.svelte',
  'extensions/scylla-base/src/features/roles/presentation/ui/components/RolesLoadError.svelte',
  'extensions/scylla-base/src/features/secret/presentation/ui/EditSecretDialog/ReplaceSecretValueDialog.svelte',
  'extensions/scylla-base/src/features/triggers/presentation/ui/pipeline-panel/PipelineTriggersPanel/PipelineTriggersPanel.svelte',
  'extensions/scylla-base/src/features/user/presentation/ui/account/ChangeEmail/ChangeEmail.page.svelte',
  'extensions/scylla-base/src/features/user/presentation/ui/components/SessionList.svelte',
  'extensions/scylla-base/src/features/integrations/presentation/ui/Integrations/ConnectionTable.svelte',
  // A hint line that is always there and turns red: it reserves its line on purpose.
  'extensions/scylla-base/src/features/marketplace/presentation/ui/Package/AddToLibraryForm.svelte',
  'extensions/scylla-base/src/features/pipeline/presentation/ui/RunPipelineDialog/RunPipelineForm.svelte',
  // An alert of a panel or of the canvas, not under a field.
  'extensions/scylla-base/src/features/pipeline/presentation/ui/editor/blueprint/canvas/nodes/PipelineNodeDetailed.svelte',
  'extensions/scylla-base/src/features/pipeline/presentation/ui/editor/blueprint/PipelineBlueprint.svelte',
  'extensions/scylla-base/src/features/pipeline/presentation/ui/editor/blueprint/side-panel/NodeInspector/NodeInspector.svelte',
  'extensions/scylla-base/src/features/pipeline/presentation/ui/editor/scripting/NodeProperties/NodeProperties.svelte',
  // Other fixes move these to FieldMessage.
  'extensions/scylla-base/src/features/user/presentation/ui/components/UserAvatarCard/UserAvatarEditor.svelte',
  'extensions/scylla-base/src/shared/presentation/ui/forms/AgentLabelsField/AgentLabelsField.svelte',
]);

describe('field errors', () => {
  it('go through FieldMessage, so each one slides in and out', () => {
    const offenders = ['extensions', 'packages']
      .flatMap(dir => svelteFiles(join(REPO, dir)))
      .map(file => relative(REPO, file).split(sep).join('/'))
      .filter(file => !file.endsWith('FieldMessage.svelte') && !NOT_A_FIELD_ERROR.has(file))
      .filter(file => OWN_ERROR.test(readFileSync(join(REPO, file), 'utf8')));

    expect(offenders).toEqual([]);
  });
});
