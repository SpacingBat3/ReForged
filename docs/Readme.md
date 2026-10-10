<!--
SPDX-FileCopyrightText: 2022-2026 Dawid Papiewski "SpacingBat3" <spacingbat3@gmail.com>

SPDX-License-Identifier: ISC
-->

<div align="right">

[![REUSE status](https://api.reuse.software/badge/github.com/SpacingBat3/ReForged)](https://api.reuse.software/info/github.com/SpacingBat3/ReForged)
[![CodeCov](https://codecov.io/gh/SpacingBat3/ReForged/graph/badge.svg?token=83BCHPFQHS)](https://codecov.io/gh/SpacingBat3/ReForged)

</div><div align="center">

[![ReForged Icon](https://user-images.githubusercontent.com/57194920/216773020-10a50af0-91f2-4956-9598-c10a3f61a355.svg)](https://github.com/SpacingBat3/ReForged#readme)

# ReForged

Asynchronous toolkit targetting [Electron Forge][forge] API and from-scratch approach
for packaging.

</div>

## About

ReForged is a project that tries to design its toolkit system for Electron
software packaging on top [Electron Forge][forge], while in contrast to
[Forge][forge], focusing on software packaging implementations done from
scratch. It is structured as NPM module-based monorepo, like [Forge][forge]
itself is.

This approach has quite a few advantages: it allows a bit more centralised
development of packaging that is free of upstream issues, which was a bit of
hussle for [Forge][forge] in the past, as many of the issues were actually
problems with dependant packages that Forge utilises and/or wraps.
Additionally, since it is a non-wrapper approach, it allows anyone involved
in development to understand the whole process for a given tool and to
centralise the code for it under the same organizational unit, which speeds
up the code research and bug fixing drastically. There are also some minor
benefits, like platform and architecture independent behavior (due to
majority of logic being implemented in TypeScript), as long as required
toolset can be provided.

At the same time, you might see a major flaw of this approach: as
reimplementation, it might not always follow the packaging standards up to
date, or offer full feature set. For commercial-grade software that depends
on estabilished solutions, you might preffer chosing [Forge][forge] approach
and tooling.

## Components

### Public

#### [![@reforged/maker-appimage][badge-maker-appimage]](https://www.npmjs.com/package/@reforged/maker-appimage)

A direct implementation of [AppImage] packaging for [Forge][forge],
doing entire packaging from scratch like `appimagetool`. It supports
only the SquashFS packaged applications, although it might be considered
to implement other backends as well in the future (feedback is welcome!).
It should also be asynchronous and RAM-focused for storage and IO to offer
competetive performance, while being TypeScript-written makes it platform
independent solution (as long as platform support neccesary toolkits).


#### [![@reforged/plugin-launcher][badge-plugin-launcher]](https://www.npmjs.com/package/@reforged/plugin-launcher)

Allows you to define additional executable/script that runs before Electron.
Currently limited to Linux and with unstable API (as defined by SemVer
zero-versioning).

### Development

#### [![@reforged/maker-types][badge-maker-types]](https://www.npmjs.com/package/@reforged/maker-types)

Provides common interfaces to standardise maker configuration properties
across common platforms, allowing for contract promises to set up ReForged
makers always the same way for the most part. You might also depend on this
package if you want to implement your own makers and offer similar promises
like ReForged does.

## License

This project follows [REUSE] specification to match copyrighted material
to software licenses and copyright. You might see overall list of
licenses used in this project in [`LICENSES/`] folder.

[^1]: Partially implemented; no official Forge API for representation yet.

<!-- LINKS -->
[AppImage]:    https://appimage.org
[forge]:       https://github.com/electron/forge
[maker1]:      https://www.npmjs.com/package/@reforged/maker-appimage
[plugin1]:     https://www.npmjs.com/package/@reforged/plugin-launcher
[REUSE]:       https://reuse.software/

<!-- FILE REFS -->
[`LICENSES/`]: ../LICENSES/

<!-- BADGES -->
[badge-maker-appimage]:  https://img.shields.io/npm/v/%40reforged%2Fmaker-appimage?style=for-the-badge&logo=npm&label=%40reforged%2Fmaker-appimage
[badge-plugin-launcher]: https://img.shields.io/npm/v/%40reforged%2Fplugin-launcher?style=for-the-badge&logo=npm&label=%40reforged%2Fplugin-launcher
[badge-maker-types]:     https://img.shields.io/npm/v/%40reforged%2Fmaker-types?style=for-the-badge&logo=npm&label=%40reforged%2Fmaker-types
