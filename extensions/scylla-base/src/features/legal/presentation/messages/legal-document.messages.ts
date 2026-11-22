import { msg } from '@lingui/core/macro';

/** The texts of the public page of a legal document. */
export const legalDocumentMessages = {
  backToScylla: msg`Back to Scylla`,
  print: msg`Print`,
  language: msg`Language`,
  onThisPage: msg`On this page`,
  eyebrow: (kind: string) => msg`Legal · ${kind}`,
  updatedOn: (date: string) => msg`Last updated on ${date}`,
  version: (version: string) => msg`Version ${version}`,
  otherDocuments: msg`Other documents`,
  otherDocumentsLead: msg`Other documents:`,
  notFoundTitle: msg`This document does not exist`,
  notFoundBody: msg`The operator of this server did not publish this document.`,
  elsewhereBody: msg`Your browser opens it now. If it does not, use the link.`,
  open: msg`Open the document`,
  operator: msg`Operator of this service`,
  operatorName: msg`Name`,
  operatorAddress: msg`Address`,
  operatorRegistration: msg`Registration`,
  publicationDirector: msg`Director of publication`,
  operatorContact: msg`Contact`,
  operatorHost: msg`Host`,
  privacyContact: msg`Privacy contact`,
  trackers: msg`Cookies and storage that Scylla uses`,
};
