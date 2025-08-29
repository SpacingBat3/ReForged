<div align="right">

[![CodeCov](https://codecov.io/gh/SpacingBat3/ReForged/graph/badge.svg?token=83BCHPFQHS)](https://codecov.io/gh/SpacingBat3/ReForged)

</div><div align="center">

[![ReForged Icon](https://user-images.githubusercontent.com/57194920/216773020-10a50af0-91f2-4956-9598-c10a3f61a355.svg)](https://github.com/SpacingBat3/ReForged#readme)

# ReForged

A set of [Electron Forge][forge] tools, makers and publishers.

</div>

## Status

Currently, this project is still very immature and some details are undecided
yet about this project. The currently planned and implemented parts of this
project are:

- [X] [`@reforged/maker-appimage`][maker1] – a simple, asynchronous [AppImage]
  maker. Basically reimplementation of `appimagetool` in TypeScript, but using
  system-wide `mksquashfs` and written natively for Forge API. Has potential for
  packaging AppImage-alternative formats as well (right now, custom runtimes
  are supported only).

  - [X] Emit / show current task and its progress [^1].
  - [ ] Support passing and generating update information to AppImages (`zsync`).
  - [ ] Support checksum embedding into AppImage runtime.
  - [ ] Support AppImage signing (`gpg`).

- [X] `@reforged/plugin-launcher` - adds executable to the app
  directory to be launched instead of binary, for additional features not yet
  possible to be achieved within Electron app directly.

- [ ] `@reforged/maker-alpm` – maker for Arch Linux `pacman` packages. Ideally,
  it should directly generate a tarball with necessary metadata while supporting
  most features like package signing.

## License

For information on which software licenses may the ReForged project be
distributed, see [`COPYING`](../COPYING) file.

[^1]: Partially implemented; no official Forge API for representation yet.

[AppImage]: https://appimage.org
[forge]:    https://github.com/electron/forge
[maker1]:   https://www.npmjs.com/package/@reforged/maker-appimage
[plugin1]:  https://www.npmjs.com/package/@reforged/plugin-launcher
