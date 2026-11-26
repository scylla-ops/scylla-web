import FolderIcon from '@lucide/svelte/icons/folder';
import RocketIcon from '@lucide/svelte/icons/rocket';
import GlobeIcon from '@lucide/svelte/icons/globe';
import PackageIcon from '@lucide/svelte/icons/package';
import ServerIcon from '@lucide/svelte/icons/server';
import CpuIcon from '@lucide/svelte/icons/cpu';
import WorkflowIcon from '@lucide/svelte/icons/workflow';
import GitBranchIcon from '@lucide/svelte/icons/git-branch';
import PlayIcon from '@lucide/svelte/icons/play';
import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
import ClockIcon from '@lucide/svelte/icons/clock';
import BotIcon from '@lucide/svelte/icons/bot';
import PaletteIcon from '@lucide/svelte/icons/palette';
import SearchIcon from '@lucide/svelte/icons/search';
import UploadIcon from '@lucide/svelte/icons/upload';
import PinIcon from '@lucide/svelte/icons/pin';
import DatabaseIcon from '@lucide/svelte/icons/database';
import CloudIcon from '@lucide/svelte/icons/cloud';
import TerminalIcon from '@lucide/svelte/icons/terminal';
import CodeIcon from '@lucide/svelte/icons/code';
import LayersIcon from '@lucide/svelte/icons/layers';
import BoxIcon from '@lucide/svelte/icons/box';
import ContainerIcon from '@lucide/svelte/icons/container';
import ShieldIcon from '@lucide/svelte/icons/shield';
import LockIcon from '@lucide/svelte/icons/lock';
import KeyIcon from '@lucide/svelte/icons/key';
import HammerIcon from '@lucide/svelte/icons/hammer';
import WrenchIcon from '@lucide/svelte/icons/wrench';
import BugIcon from '@lucide/svelte/icons/bug';
import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';
import BookOpenIcon from '@lucide/svelte/icons/book-open';
import FileCodeIcon from '@lucide/svelte/icons/file-code';
import ZapIcon from '@lucide/svelte/icons/zap';
import FlameIcon from '@lucide/svelte/icons/flame';
import LeafIcon from '@lucide/svelte/icons/leaf';
import HeartIcon from '@lucide/svelte/icons/heart';
import StarIcon from '@lucide/svelte/icons/star';
import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
import MonitorIcon from '@lucide/svelte/icons/monitor';
import MailIcon from '@lucide/svelte/icons/mail';
import UsersIcon from '@lucide/svelte/icons/users';
import ActivityIcon from '@lucide/svelte/icons/activity';
import GaugeIcon from '@lucide/svelte/icons/gauge';
import SettingsIcon from '@lucide/svelte/icons/settings';
import GraduationCapIcon from '@lucide/svelte/icons/graduation-cap';
import BriefcaseIcon from '@lucide/svelte/icons/briefcase';
import BuildingIcon from '@lucide/svelte/icons/building';
import StoreIcon from '@lucide/svelte/icons/store';
import type { LucideIcon } from '../../icon.ts';

/** A glyph that a person can choose for an entity, with its words for the search. */
export interface EntityGlyph {
  /** The lucide name, which the server keeps. */
  name: string;
  icon: LucideIcon;
  /** Words of the search, in English and in French, after the name. */
  keywords: string;
}

/** The glyphs of the icon picker, in the order of its grid. */
export const ENTITY_GLYPHS: readonly EntityGlyph[] = [
  { name: 'folder', icon: FolderIcon, keywords: 'dossier projet' },
  { name: 'rocket', icon: RocketIcon, keywords: 'fusée déploiement deploy' },
  { name: 'globe', icon: GlobeIcon, keywords: 'web site monde internet' },
  { name: 'package', icon: PackageIcon, keywords: 'paquet colis livraison' },
  { name: 'server', icon: ServerIcon, keywords: 'serveur machine' },
  { name: 'cpu', icon: CpuIcon, keywords: 'processeur puce' },
  { name: 'workflow', icon: WorkflowIcon, keywords: 'flux pipeline' },
  { name: 'git-branch', icon: GitBranchIcon, keywords: 'git branche github gitlab' },
  { name: 'play', icon: PlayIcon, keywords: 'lancer exécuter run' },
  { name: 'calendar-clock', icon: CalendarClockIcon, keywords: 'calendrier planning cron' },
  { name: 'clock', icon: ClockIcon, keywords: 'horloge heure temps' },
  { name: 'bot', icon: BotIcon, keywords: 'robot agent' },
  { name: 'palette', icon: PaletteIcon, keywords: 'couleur design' },
  { name: 'search', icon: SearchIcon, keywords: 'recherche loupe' },
  { name: 'upload', icon: UploadIcon, keywords: 'envoi import' },
  { name: 'pin', icon: PinIcon, keywords: 'épingle' },
  { name: 'database', icon: DatabaseIcon, keywords: 'base données' },
  { name: 'cloud', icon: CloudIcon, keywords: 'nuage' },
  { name: 'terminal', icon: TerminalIcon, keywords: 'console shell' },
  { name: 'code', icon: CodeIcon, keywords: 'code source' },
  { name: 'layers', icon: LayersIcon, keywords: 'couches pile stack' },
  { name: 'box', icon: BoxIcon, keywords: 'boîte conteneur' },
  { name: 'container', icon: ContainerIcon, keywords: 'conteneur docker' },
  { name: 'shield', icon: ShieldIcon, keywords: 'bouclier sécurité' },
  { name: 'lock', icon: LockIcon, keywords: 'cadenas verrou' },
  { name: 'key', icon: KeyIcon, keywords: 'clé secret' },
  { name: 'hammer', icon: HammerIcon, keywords: 'marteau build' },
  { name: 'wrench', icon: WrenchIcon, keywords: 'clé outil maintenance' },
  { name: 'bug', icon: BugIcon, keywords: 'bogue débogage' },
  { name: 'flask-conical', icon: FlaskConicalIcon, keywords: 'test fiole labo' },
  { name: 'book-open', icon: BookOpenIcon, keywords: 'livre documentation docs' },
  { name: 'file-code', icon: FileCodeIcon, keywords: 'fichier code' },
  { name: 'zap', icon: ZapIcon, keywords: 'éclair rapide' },
  { name: 'flame', icon: FlameIcon, keywords: 'flamme feu' },
  { name: 'leaf', icon: LeafIcon, keywords: 'feuille' },
  { name: 'heart', icon: HeartIcon, keywords: 'coeur' },
  { name: 'star', icon: StarIcon, keywords: 'étoile' },
  { name: 'smartphone', icon: SmartphoneIcon, keywords: 'mobile téléphone' },
  { name: 'monitor', icon: MonitorIcon, keywords: 'écran' },
  { name: 'mail', icon: MailIcon, keywords: 'courriel e-mail' },
  { name: 'users', icon: UsersIcon, keywords: 'équipe personnes' },
  { name: 'activity', icon: ActivityIcon, keywords: 'activité' },
  { name: 'gauge', icon: GaugeIcon, keywords: 'jauge performance' },
  { name: 'settings', icon: SettingsIcon, keywords: 'réglages paramètres' },
  { name: 'graduation-cap', icon: GraduationCapIcon, keywords: 'école formation' },
  { name: 'briefcase', icon: BriefcaseIcon, keywords: 'travail mallette' },
  { name: 'building', icon: BuildingIcon, keywords: 'bâtiment entreprise' },
  { name: 'store', icon: StoreIcon, keywords: 'boutique magasin' },
];

const BY_NAME = new Map(ENTITY_GLYPHS.map(glyph => [glyph.name, glyph.icon]));

/** The glyph of a name, or `undefined` for a name that this build does not know. */
export const entityGlyph = (name: string): LucideIcon | undefined => BY_NAME.get(name);
