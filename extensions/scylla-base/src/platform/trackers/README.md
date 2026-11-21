# `platform/trackers`

> [Scylla frontend](../../../../../README.md) › `platform/trackers` · [agent guide](./AGENTS.md)

The list of each cookie and each key of the browser storage that Scylla uses. The law (ePrivacy
art. 5(3)) asks for consent before a tracker that is not strictly necessary. The CNIL asks to
tell the users about the trackers that are exempt too. Thus the registry has one entry for each
tracker, and the app reads it:

- the cookie page (`/legal/cookies`) shows the table under the text of the operator;
- the admin page "Legal and privacy" shows the state of the consent banner: off while every
  tracker is exempt;
- a tracker that is not exempt names its purpose (analytics, marketing, support), and turns the
  consent framework on (`platform/consent`): the banner, the cookie settings and their entries;
- a test fails when the code uses a cookie or a storage key that has no entry.

An extension adds its own trackers with a patch of `trackersPoints.trackers`, from
`@scylla/base-sdk`.
