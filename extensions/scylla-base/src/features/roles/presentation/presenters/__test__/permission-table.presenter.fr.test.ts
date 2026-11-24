import { describe, expect, it } from 'vitest';
import { messages } from '@base/features/roles/locales/fr/messages.ts';
import { withLocale } from '@test/i18n.ts';
import type { CatalogArea } from '../../../domain/structs/catalog.struct.ts';
import { areaLabels } from '../../messages/roles.messages.ts';
import {
  actionLabel,
  cellTitle,
  permissionLabel,
  permissionRows,
} from '../permission-table.presenter.ts';
import { t } from '@scylla/ui/i18n';

withLocale('fr', messages);

const area = (id: string, level: CatalogArea['level'], actions: string[]): CatalogArea => ({
  id,
  level,
  machine: false,
  permissions: actions.map(action => ({
    id: `${id}.${action}`,
    action,
    dependsOn: [],
    implicit: false,
  })),
});

const catalog = [
  area('git_providers', 'platform', ['manage']),
  area('integrations', 'workspace', ['view', 'manage']),
  area('repository', 'project', ['view', 'edit']),
  area('jobs', 'project', ['view', 'approve']),
];

describe('the permissions of the Git integration in French', () => {
  it('translates the new areas and their descriptions', () => {
    expect(permissionLabel('integrations.manage', catalog)).toBe('Intégrations · Gérer');
    expect(permissionLabel('repository.edit', catalog)).toBe('Dépôt · Modifier');
    expect(t(areaLabels.git_providers.hint)).toBe("L'app GitHub de l'instance");
    expect(t(areaLabels.integrations.hint)).toBe('Connexions à GitHub et GitLab');
    expect(t(areaLabels.repository.hint)).toBe('Le dépôt Git lié et la source des pipelines');
  });

  it('translates the Approve column and the full names', () => {
    const approve = permissionRows(catalog.slice(3), catalog, 'project', new Set())[0]?.cells.find(
      cell => cell.action === 'approve',
    );

    expect(actionLabel('approve')).toBe('Approuver');
    expect(permissionLabel('jobs.approve', catalog)).toBe('Approuver les exécutions de forks');
    expect(permissionLabel('git_providers.manage', catalog)).toBe('Gérer les fournisseurs Git');
    expect(approve && 'id' in approve && cellTitle(approve, catalog)).toBe(
      "Approuver ou refuser l'exécution d'une pull request venant d'un fork. Cette exécution ne reçoit jamais les secrets.",
    );
  });
});
