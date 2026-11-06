# Notifications

The inbox of the signed-in user: invitations to answer, changes of roles, owners and instance
admins, and changes of the account.

The server keeps a kind and its parameters, not a sentence, so a change of language changes the old
rows too. The answer to an invitation is in the row, with no mail link: a user with the verified
email of the invitation can accept or decline by its id.

The bell reads only the counts. The list loads when the panel opens, and each read of a list checks
the access of the reader on the server. So the count can hold a row that the list hides, for a short
time.

There is no stream: a browser reads a count each 30 seconds, and the server keeps no state for it.
