import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { i18n, type MessageDescriptor, type Messages } from '@lingui/core';
import {
  setAppNavigator,
  type AppNavLink,
  type CommandDefinition,
  type ModuleRoute,
  type ScyllaModule,
} from '@scylla/core-sdk';
import { plainMessage, type SupportedLocale } from '@scylla/ui/i18n';
import { can, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { modules as featureModules } from '@base/shell/modules.ts';
import { ShellModule } from '@base/shell/shell.module.ts';
import { commandResults, resultItems } from './command-results.presenter.ts';
import { buildCommandRows, type CommandRow } from './command-rows.presenter.ts';

/**
 * The real labels of the extension, in both languages, with the real catalogs: what the user can
 * type must find what the user means. The names of the entities are examples.
 */

const modules: readonly ScyllaModule[] = [ShellModule, ...featureModules];
const sections = modules.flatMap(module => module.navSections ?? []);

const compiled = import.meta.glob<{ messages: Messages }>(
  '/{extensions,packages}/**/locales/*/messages.ts',
  { eager: true },
);

const catalogOf = (locale: SupportedLocale): Messages =>
  Object.entries(compiled)
    .filter(([path]) => path.includes(`/locales/${locale}/`))
    .reduce<Messages>((all, [, module]) => Object.assign(all, module.messages), {});

const catalogs = { en: catalogOf('en'), fr: catalogOf('fr') };

const linksOf = (routes: readonly ModuleRoute[], parent: readonly string[] = []): AppNavLink[] =>
  routes.flatMap(route => {
    const path = [...parent, ...(route.path ?? '').split('/').filter(Boolean)];
    const own = [route.nav ?? []].flat().filter(link => link.inCommandBar !== false).map((link): AppNavLink => {
      const url = path
        .map(part => (part.startsWith(':') && link.params?.[part.slice(1)]) || part)
        .join('/');
      const section = sections.find(({ id }) => id === link.section);
      return {
        href: `/${url}`,
        url,
        title: link.title,
        keywords: link.keywords,
        icon: link.icon,
        section: { id: link.section, title: section?.title ?? link.title },
        group: link.group?.title,
      };
    });
    return [...own, ...linksOf(route.children ?? [], path)];
  });

const links = modules.flatMap(({ routes = {} }) => Object.values(routes).flatMap(list => linksOf(list)));

const commands: CommandDefinition[] = modules.flatMap(module => module.commands ?? []);


const rowsIn = (locale: SupportedLocale, context: { pipelineId?: string } = {}): CommandRow[] => {
  i18n.activate(locale);
  return buildCommandRows({
    links,
    commands,
    slug: 'acme',
    workspaceId: 'w1',
    project: { id: 'p1', name: 'web-api' },
    pipelineId: context.pipelineId,
    can,
    other: (message: MessageDescriptor | undefined) =>
      plainMessage(catalogs[locale === 'en' ? 'fr' : 'en'], message?.id),
    projects: [
      { id: 'p1', name: 'web-api' },
      { id: 'p2', name: 'mobile-app' },
      { id: 'p3', name: 'infrastructure' },
    ],
    pipelines: [
      { id: 'l1', name: 'Deploy', projectId: 'p1' },
      { id: 'l2', name: 'Deploy', projectId: 'p2' },
      { id: 'l3', name: 'Build web', projectId: 'p1' },
      { id: 'l4', name: 'nightly-tests', projectId: 'p3' },
    ],
    apps: [{ id: 'a1', name: 'prod-runner-eu', runner: true }],
    members: [
      { actorId: 'u1', actorKind: 'user', displayName: 'Sébastien Lucas', handle: 'sebastien.lucas' },
      { actorId: 'u2', actorKind: 'user', displayName: 'Marie Dubois', handle: 'marie' },
    ],
    workspaceRoles: [],
    instanceRoles: [],
    secrets: [{ name: 'DATABASE_URL' }],
    workspaces: [{ id: 'w1', name: 'Acme', slug: 'acme' }],
  });
};


const shown = (rows: readonly CommandRow[], text: string): string[] =>
  resultItems(commandResults(rows, text, null, { recent: [], openProject: 'p1', here: 'project' }))
    .filter(item => item.kind === 'row')
    .map(item => item.id);

const PAGE = {
  dashboard: 'page:workspace/dashboard',
  allProjects: 'page:workspace/projects',
  pipelines: 'page:project/',
  secrets: 'page:project/secrets',
  projectMembers: 'page:project/members',
  members: 'page:workspace/members',
  roles: 'page:workspace/roles',
  instanceRoles: 'page:instance/roles',
  agents: 'page:workspace/agents',
  apps: 'page:workspace/apps',
  browse: 'page:workspace/marketplace',
  general: 'page:workspace/settings',
  users: 'page:instance/users',
  extensions: 'page:instance/extensions',
  settings: 'page:instance/settings',
  profile: 'page:account/account/profile',
  appearance: 'page:account/account/appearance',
  security: 'page:account/account/security',
  tokens: 'page:account/account/tokens',
  danger: 'page:account/account/danger-zone',
};

const COMMAND = {
  light: 'command:user.theme-light',
  dark: 'command:user.theme-dark',
  system: 'command:user.theme-system',
  english: 'command:shell.language-en',
  french: 'command:shell.language-fr',
  signOut: 'command:login.sign-out',
  newProject: 'command:project.create',
  newPipeline: 'command:pipeline.create',
  newAgent: 'command:apps.create-agent',
  newSecret: 'command:secret.create',
  newWorkspace: 'command:workspace.create',
};

const THEMES = [PAGE.appearance, COMMAND.light, COMMAND.dark, COMMAND.system];
const SETTINGS = [PAGE.settings, PAGE.general];
const MEMBERS = [PAGE.members, PAGE.projectMembers];
const ROLES = [PAGE.roles, PAGE.instanceRoles];
const DEPLOY = ['pipeline:l1', 'pipeline:l2'];

/** [typed text, what must be in the first three rows]. */
const ENGLISH: readonly (readonly [string, readonly string[]])[] = [
  ['theem', THEMES], ['thme', THEMES], ['themee', THEMES],
  ['drak', [COMMAND.dark]], ['dakr theme', [COMMAND.dark]], ['dark tehme', [COMMAND.dark]],
  ['lihgt', [COMMAND.light]], ['ligth', [COMMAND.light]], ['ligt', [COMMAND.light]],
  ['sytem', [COMMAND.system]],
  ['aperance', [PAGE.appearance]], ['apparance', [PAGE.appearance]], ['appearence', [PAGE.appearance]],
  ['seting', SETTINGS], ['settigns', SETTINGS], ['stetings', SETTINGS], ['sttings', SETTINGS],
  ['membres', MEMBERS], ['memebrs', MEMBERS], ['menbers', MEMBERS], ['mebers', MEMBERS],
  ['rolse', ROLES], ['rols', ROLES],
  ['agnets', [PAGE.agents]], ['agets', [PAGE.agents]], ['agentz', [PAGE.agents]],
  ['aps', [PAGE.apps]], ['appps', [PAGE.apps]],
  ['secrest', [PAGE.secrets, COMMAND.newSecret, 'secret:p1:DATABASE_URL']],
  ['secerts', [PAGE.secrets]], ['sercets', [PAGE.secrets]],
  ['pipleines', [PAGE.pipelines]], ['piplines', [PAGE.pipelines]], ['pipeliens', [PAGE.pipelines]],
  ['extnesions', [PAGE.extensions]], ['extentions', [PAGE.extensions]],
  ['usres', [PAGE.users]], ['uers', [PAGE.users]],
  ['tokns', [PAGE.tokens]], ['tokesn', [PAGE.tokens]],
  ['profiel', [PAGE.profile]],
  ['secuirty', [PAGE.security]], ['securty', [PAGE.security]],
  ['dnager', [PAGE.danger]],
  ['sign otu', [COMMAND.signOut]], ['signout', [COMMAND.signOut]], ['sing out', [COMMAND.signOut]],
  ['logout', [COMMAND.signOut]],
  ['new projcet', [COMMAND.newProject]], ['nwe project', [COMMAND.newProject]],
  ['creat project', [COMMAND.newProject]],
  ['new piepline', [COMMAND.newPipeline]],
  ['invte', [PAGE.members]],
  ['wrokspace', [COMMAND.newWorkspace, PAGE.general, 'workspace:w1']],
  ['frnech', [COMMAND.french]],
  ['wbe api', ['project:p1']], ['webapi', ['project:p1']], ['web apu', ['project:p1']],
  ['mobil app', ['project:p2']], ['moible', ['project:p2']],
  ['infrastucture', ['project:p3']], ['infrasturcture', ['project:p3']],
  ['delpoy', DEPLOY], ['deply', DEPLOY],
  ['depoly web', ['pipeline:l1']], ['deploy mobile', ['pipeline:l2']],
  ['biuld', ['pipeline:l3']], ['build wbe', ['pipeline:l3']], ['bw', ['pipeline:l3']],
  ['nighlty', ['pipeline:l4']], ['nightly test', ['pipeline:l4']],
  ['prdo runner', ['app:a1']], ['runer', ['app:a1', PAGE.agents]],
  ['marie dubio', ['member:u2']], ['dubios', ['member:u2']],
  ['databse url', ['secret:p1:DATABASE_URL']], ['database_ulr', ['secret:p1:DATABASE_URL']],
];

const FRENCH: readonly (readonly [string, readonly string[]])[] = [
  ['thème', THEMES], ['theme', THEMES], ['tehme', THEMES],
  ['somber', [COMMAND.dark]], ['sombr', [COMMAND.dark]], ['theme sombre', [COMMAND.dark]],
  ['claire', [COMMAND.light]], ['calir', [COMMAND.light]],
  ['parametres', SETTINGS], ['paramettres', SETTINGS], ['parmètres', SETTINGS], ['paramtres', SETTINGS],
  ['membre', MEMBERS], ['mmebres', MEMBERS],
  ['roles', ROLES], ['rloes', ROLES],
  ['utilisateur', [PAGE.users]], ['utlisateurs', [PAGE.users]], ['utilistaeurs', [PAGE.users]],
  ['securite', [PAGE.security]], ['sécurtié', [PAGE.security]],
  ['apparence', [PAGE.appearance]], ['aparence', [PAGE.appearance]],
  ['profile', [PAGE.profile]],
  ['deconnecter', [COMMAND.signOut]], ['déconecter', [COMMAND.signOut]], ['se deconecte', [COMMAND.signOut]],
  ['nouveau projte', [COMMAND.newProject]], ['nouvo projet', [COMMAND.newProject]],
  ['nouvel agnet', [COMMAND.newAgent]],
  ['inviter un memrbe', [PAGE.members]],
  ['espace de travial', [COMMAND.newWorkspace, PAGE.general, 'workspace:w1']],
  ['tableu de bord', [PAGE.dashboard]],
  ['vue densemble', [PAGE.dashboard]],
  ['zone de dagner', [PAGE.danger]],
  ['parcourrir', [PAGE.browse]],
  ['anglias', [COMMAND.english]],
  ['sebastien', ['member:u1']], ['sebatsien', ['member:u1']], ['lucas seb', ['member:u1']],
];

/** Common words with no link to the app: few of them may give a row. */
const UNRELATED = `apple banana window garden river mountain coffee letter summer winter doctor
  teacher market bridge castle forest island kitchen mirror pencil rabbit silver tomato violin yellow
  zebra bottle candle dragon engine feather guitar hammer jacket kettle ladder magnet needle orange
  parrot quartz ribbon saddle tunnel umbrella velvet walnut anchor basket cactus dolphin elbow falcon
  ginger helmet insect jungle koala lizard meadow nectar oyster peanut quiver rocket sponge turtle
  unicorn vacuum whisper yogurt almond bucket cherry donkey eagle fabric glacier hazel iceberg jigsaw
  kitten lemon mango napkin olive pepper quilt radish salmon tiger uniform vulture wagon xylophone
  bakery ceiling drawer envelope furnace grocery hallway ironing journal lantern mattress notebook
  oatmeal pillow raincoat sandwich teapot utensil vinegar wardrobe billing facture kubernetes
  terraform graphql wallet`.split(/\s+/);

const STOP_WORDS = new Set(['a', 'an', 'and', 'in', 'of', 'the', 'to', 'de', 'la', 'le', 'les', 'du', 'des', 'un', 'une', 'd', 'l', 'en', 'et', 'au', 'aux']);

const randomOf = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let mix = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  mix = (mix + Math.imul(mix ^ (mix >>> 7), 61 | mix)) ^ mix;
  return ((mix ^ (mix >>> 14)) >>> 0) / 4294967296;
};

const random = randomOf(42);
const at = (length: number) => Math.floor(random() * length);
const letter = () => 'abcdefghijklmnopqrstuvwxyz'[at(26)];

const ERRORS: readonly ((word: string) => string)[] = [
  word => {
    const index = at(word.length - 1);
    return word.slice(0, index) + word[index + 1] + word[index] + word.slice(index + 2);
  },
  word => {
    const index = at(word.length);
    return word.slice(0, index) + word.slice(index + 1);
  },
  word => {
    const index = at(word.length + 1);
    return word.slice(0, index) + letter() + word.slice(index);
  },
  word => {
    const index = at(word.length);
    return word.slice(0, index) + letter() + word.slice(index + 1);
  },
];

const plain = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** The share of the texts with errors that keep a row of the same name in the first three. */
const measure = (locale: SupportedLocale, errors: number): number => {
  const rows = rowsIn(locale).filter(row => !row.gate);
  // The active choice is last on purpose.
  const targets = rows.filter(row => row.verb !== undefined);
  let total = 0;
  let found = 0;
  for (const row of targets) {
    const name = plain(row.name);
    const sameName = new Set(rows.filter(other => plain(other.name) === name).map(({ id }) => id));
    for (const word of name.split(/[^\p{L}\p{N}]+/u)) {
      if (word.length < (errors === 1 ? 3 : 6) || STOP_WORDS.has(word)) continue;
      for (let round = 0; round < 12; round++) {
        let typed = word;
        for (let error = 0; error < errors; error++) typed = ERRORS[at(ERRORS.length)](typed);
        if (typed === word) continue;
        total++;
        if (shown(rows, name.replace(word, typed)).slice(0, 3).some(id => sameName.has(id))) found++;
      }
    }
  }
  return found / total;
};

describe('the command bar on the real labels', () => {
  beforeAll(() => {
    i18n.load({ en: catalogs.en, fr: catalogs.fr });
    permissionsStore.setState({
      permissions: {
        scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
      },
    });
    contextStore.setState({
      workspace: { id: 'w1', name: 'Acme', slug: 'acme' },
      project: { id: 'p1', name: 'web-api' },
    });
    setAppNavigator({
      navigate: () => undefined,
      back: () => undefined,
      pathname: () => '/acme/projects/p1',
      search: () => '',
      params: () => ({ workspaceSlug: 'acme', projectId: 'p1' }),
      trail: () => [],
    });
  });

  afterAll(() => {
    i18n.activate('en');
    setAppNavigator(null);
    permissionsStore.setState({ permissions: null });
    contextStore.getState().reset();
  });

  describe('the fixed list of typing errors', () => {
    it.each(ENGLISH.map(([text, ids]) => [text, ids] as const))('English: %s', (text, ids) => {
      const first = shown(rowsIn('en'), text).slice(0, 3);
      expect(first.filter(id => ids.includes(id)), first.join(', ')).not.toEqual([]);
    });

    it.each(FRENCH.map(([text, ids]) => [text, ids] as const))('French: %s', (text, ids) => {
      const first = shown(rowsIn('fr'), text).slice(0, 3);
      expect(first.filter(id => ids.includes(id)), first.join(', ')).not.toEqual([]);
    });
  });

  describe('generated errors', () => {
    it.each(['en', 'fr'] as const)('finds a word with 1 error: %s', locale => {
      expect(measure(locale, 1)).toBeGreaterThanOrEqual(0.995);
    });

    it.each(['en', 'fr'] as const)('finds a word with 2 errors: %s', locale => {
      expect(measure(locale, 2)).toBeGreaterThanOrEqual(0.98);
    });
  });

  it('gives few rows for words with no link to the app', () => {
    const rows = rowsIn('en');
    const hits = UNRELATED.filter(word => shown(rows, word).length > 0);
    expect(hits.length / UNRELATED.length, hits.join(', ')).toBeLessThanOrEqual(0.06);
  });

  it('finds a word of the other language', () => {
    expect(shown(rowsIn('en'), 'sombre').slice(0, 3)).toContain(COMMAND.dark);
    expect(shown(rowsIn('fr'), 'dark').slice(0, 3)).toContain(COMMAND.dark);
  });

  it('goes to the page of the theme and to the theme with two different rows', () => {
    const rows = rowsIn('en');
    const [light, appearance] = [COMMAND.light, PAGE.appearance].map(id =>
      rows.find(row => row.id === id),
    );
    expect(light?.verb).toBe('Use');
    expect(appearance?.verb).toBe('Go to');
  });

  describe.each(['en', 'fr'] as const)('the rows in %s', locale => {
    it('never has two rows that read the same', () => {
      const rows = rowsIn(locale, { pipelineId: 'l1' });
      const seen = rows.map(row => `${row.name} | ${row.type} | ${row.place ?? ''}`);
      expect(seen.filter((text, index) => seen.indexOf(text) !== index)).toEqual([]);
    });

    it('says what each row does', () => {
      for (const row of rowsIn(locale)) {
        expect(row.sentence, row.id).not.toBe('');
        expect(row.type, row.id).not.toBe('');
      }
    });
  });

  it('has a French text for each word of a command', () => {
    const descriptors = commands.flatMap(command => [
      command.title,
      command.keywords,
      'type' in command ? command.type : undefined,
    ]);
    const missing = descriptors
      .filter((message): message is MessageDescriptor => !!message)
      .filter(message => !catalogs.fr[message.id])
      .map(message => message.id);
    expect(missing).toEqual([]);
  });
});

