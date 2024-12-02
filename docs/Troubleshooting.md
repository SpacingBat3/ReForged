# Troubleshooting ReForged project

This document describes necessary steps to properly troubleshoot ReForged
project's behaviour and collect

## vs Electron Forge (TL;DR)

- Unlike to Forge, ReForged aims to eliminate third-party dependencies unless
  it is greatly beneficial to use them, has no Node.js API or standard language
  equivalent and it is counter-productive to re-implement their feature-set.
- For the reasons above, ReForged doesn't rely on `debug` module. It prefers
  Node's implementation of debug logging via `util`.
- There's code for compatibility with `debug`'s `DEBUG` env variable, yet it
  might not support all wildcard formats (eg. exclusion).

## General documentation

ReForged has support for logging via `NODE_DEBUG` environment variable.
You can find more information in [Node.js documentation][docs] about its
syntax.

In general, you might log the ReForge-related components using following
sections and wildcards:

- `reforged:*` – show debug logs of all ReForged-related components.
- `reforged:[module-name]` – show debug log of the specific component,
  eg. `maker-appimage`.

For convenience, you might also use `DEBUG` env variable, yet it might have
for now limited support for the wildcard usage.

Also see [Forge's `Support.md`][forge] for more information about the logging
of each Forge's components.

[docs]: https://nodejs.org/api/util.html#utildebuglogsection-callback "util.debuglog in Node.js API Documentation"