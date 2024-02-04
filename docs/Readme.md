<div align="center">

[![ReForged Icon](https://user-images.githubusercontent.com/57194920/216773020-10a50af0-91f2-4956-9598-c10a3f61a355.svg)](https://github.com/SpacingBat3/ReForged#readme)

# ReForged

A set of [Electron Forge][forge] tools, makers and publishers.

</div>

## Status

Currently, this project is still very immature and some details are undecided
yet about this project. The currently planned and implemented parts of this
project are:

- [X] [`@reforged/maker-appimage`][maker1] – a simple yet performant AppImage
  maker, managing tasks asynchronously. Unlike to official Forge makers, this
  ones directly implements Electron Forge packaging, rather than wrapping
  another Node.js package.

  - [ ] Emit / show current task and its progress.
  - [ ] Support passing and generating update information to AppImages (`zsync`).
  - [ ] Support AppImage signing (`gpg`).

- [ ] `@reforged/maker-alpm` – maker for Arch Linux `pacman` packages. It should
  avoid the use of `makepkg`, but generate the packaged version directly. Like
  `@reforged/maker-appimage`, it should be designed to executes multiple tasks
  in asynchronous manner. Currently **WIP**.

- [ ] `@reforged/maker-flatpak` – an improved version of Flatpak maker, with
  similar concepts to `maker-appimage`: be asynchronous and directly implement
  maker rather than using other Node modules. It also aims to fix some bugs with
  the current implementation, optimally supporting
  `@electron-forge/publisher-github`.

## License

For information on which software licenses may the ReForged project be
distributed, see [`COPYING`](../COPYING) file.

[forge]: https://github.com/electron/forge
[maker1]: https://www.npmjs.com/package/@reforged/maker-appimage