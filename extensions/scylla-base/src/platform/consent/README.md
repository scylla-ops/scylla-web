# `platform/consent`

> [Scylla frontend](../../../../../README.md) › `platform/consent` · [agent guide](./AGENTS.md)

The consent to the trackers that are not strictly necessary. The law (ePrivacy art. 5(3), and
the guidelines of the CNIL) asks for a free choice before such a tracker, a refusal as easy as
an acceptance, a way to change the choice at any time, and a proof of each choice.

Scylla itself has no such tracker. Thus the framework is there, but hidden: it shows only when
the tracker registry (`platform/trackers`) has an entry with `exempt: false`, for example a
tracker that an extension adds. Then:

- a panel at the bottom of each page asks, with three buttons of the same weight: "Reject
  all", "Customize" and "Accept all". It blocks nothing: the page stays usable, and nothing
  loads before a yes;
- the cookie settings show one row for each purpose, with its partners, and a switch that is
  off by default. "Strictly necessary" is always on. The dialog shows the date of the last
  choice;
- the footer, the user menu and the privacy section of the account open the cookie settings;
- the cookie `scylla_consent` keeps the choice for 6 months. A new tracker that needs consent
  changes the version, and the banner asks again;
- the server keeps a record of each choice: the text that the person saw (as a SHA-256), each
  choice, the time, and the user when a session is open. A withdrawal is a new record. The
  records of a user are in the export of the account, and go with the account;
- Global Privacy Control is a refusal of each purpose, with no banner.

A tracker that needs consent loads its script with `whenGranted(purpose, load)`, never before.
