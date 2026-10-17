# Security

Nanotype holds no data of anyone's: the text stays in the browser that wrote it, and nothing is sent to a server except a count of visits and commands (`docs/analytics.md`). A security issue is therefore about the code on the page itself: for example a way for a share link, a pasted text or an imported file to run script, or a share link's locking being weaker than the share dialog says (AES-GCM, the seed word never leaves the browser).

Report it to support@unit.app with steps to reproduce. There is no bounty; a fix ships as soon as it is right.
