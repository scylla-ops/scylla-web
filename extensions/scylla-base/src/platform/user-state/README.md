# platform / user-state

> [Scylla frontend](../../../../../README.md) › `platform/` › **user-state** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

A person who changes device must find the same interface: the same theme and language, the same
node style, and no dialog that this person already closed. These values were only in
`localStorage`, so each new browser started again from zero. This capability keeps them on the
server, in the `UserStateService` of the backend.

## Why `localStorage` stays

The code reads the theme before the first paint, in an inline script of `index.html`. The router
and the tour also read their values with no wait. A read of the network at each of these places
makes the interface flash or wait. So the local copy stays the read copy. The server is read one
time at each page load, and the answer goes into the local copies. Code that reads a value does not
change, and the app continues to work when the server does not answer.

The cost is the time of a change between two open devices: the value of the other device arrives
at the next page load. This is correct for a preference. It is not correct for data that many
persons edit, and this data does not go here.

## Why two kinds of conflict

For a theme, the last choice is the correct value: a merge of "light" and "dark" has no meaning. For
a list of seen flags or tours, two devices can add at the same time, and neither addition must
disappear. So a key with a merge writes with the version that it read. The server refuses a write
on an old version, and the client merges with the new value and tries again.

## Why the server has a limit

The value is text that the server does not read. With no limit, a client can use this store as a
free file store. The limit is 64 KiB for each user, which is far above the few hundred bytes that
the keys of the app use.

## Why the place of a node is not here

The places of the nodes are part of a pipeline, and all members of the project see the same canvas.
They are in the pipeline, through `SavePipelineLayout`, with the permission of a pipeline edit.
