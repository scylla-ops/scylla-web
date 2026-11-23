import { msg, plural } from '@lingui/core/macro';

/** The texts of the admin page "Legal and privacy". */
export const legalSettingsMessages = {
  title: msg`Legal and privacy`,
  description: msg`The legal documents of this server and the identity of its operator. The public pages, the footer of the sign-in pages and the mails show them. Only instance admins see this page.`,
  save: msg`Save`,

  operatorTitle: msg`Operator identity`,
  operatorDescription: msg`The organization or the person that runs this server. The legal notice shows these fields above its text.`,
  name: msg`Legal name`,
  namePlaceholder: msg`Acme SAS`,
  contact: msg`Contact`,
  contactPlaceholder: msg`legal@acme.example`,
  address: msg`Registered address`,
  registration: msg`Registration`,
  registrationHint: msg`The registration number, the share capital and the VAT number.`,
  publicationDirector: msg`Director of publication`,
  host: msg`Host`,
  hostHint: msg`The name, the address and the phone number of the host of the servers.`,

  documentsTitle: msg`Documents`,
  documentsDescription: msg`Each document is off, a link to a page of your site, or a text in Markdown that Scylla shows on a public page. A document that is off has no page and no link.`,
  off: msg`Off`,
  link: msg`Link`,
  markdown: msg`Markdown`,
  mode: (document: string) => msg`Content of ${document}`,
  stateOff: msg`No page and no link`,
  stateLink: (url: string) => msg`Link to ${url}`,
  stateMarkdown: msg`Text in Markdown`,
  documentTitle: msg`Title`,
  titleHint: (kind: string) =>
    msg`The page of the document shows this title. The menus and the links show "${kind}" in the language of the user.`,
  url: msg`Address of the page`,
  urlInvalid: msg`The address must start with http:// or https://`,
  text: msg`Text in Markdown`,
  preview: msg`Preview`,
  edit: msg`Edit`,
  version: msg`Version`,
  effectiveDate: msg`Date of effect`,
  acceptAgain: msg`Users must accept this version again`,
  changes: msg`What changes`,
  changesHint: msg`One change on each line. A user who accepted an earlier version sees this list before accepting the new version.`,
  cookiesHint: msg`The page shows the table of the cookies and storage keys under your text. An empty text shows the table only.`,
  noticeHint: msg`The page shows the operator identity above your text.`,
  publish: (version: string) => msg`Publish version ${version}`,

  privacyTitle: msg`Privacy contact`,
  privacyDescription: msg`The address that users write to about their personal data. The legal notice shows it.`,
  privacyContact: msg`Email or page`,
  privacyPlaceholder: msg`privacy@acme.example`,

  bannerTitle: msg`Consent banner`,
  bannerOff: msg`Off`,
  bannerOn: msg`On`,
  bannerOffBody: (count: number) =>
    msg`No tracker needs consent: the registry lists ${plural(count, {
      one: '# strictly necessary item',
      other: '# strictly necessary items',
    })}.`,
  bannerOnBody: (count: number) =>
    msg`${plural(count, {
      one: '# tracker needs the consent of the users.',
      other: '# trackers need the consent of the users.',
    })}`,
  showList: msg`See the list`,
  hideList: msg`Hide the list`,
};
