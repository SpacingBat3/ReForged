# ReForged

A set of Electron Forge tools, makers and publishers.

It both includes makers not being available in Electron Forge and my own
reimplementations of some already being present in Electron Forge.

## Status

Currently, this project is still very inmature and a lot of stuff is undecided
yet about this project. The currently planned and implemented parts of this
project are:

- [X] `@reforged/maker-appimage` – a simple yet performant AppImage maker, written
  mostly asynchroniously. Unlike many Electron Forge maker, this one directly
  implements Electron Forge packaging, rather than wrapping another Node.js
  package.

  - [ ] Emit / show current task and its progress.
  - [ ] Support passing and generating update information to AppImages (`zsync`).
  - [ ] Support AppImage signing (`gpg`).

- [ ] `@reforged/maker-flatpak` – an improved version of Flatpak maker, with
  similar concepts to `maker-appimage`: be asynchronious and directly implement
  maker rather than using other Node modules. It also aims to fix some bugs with
  the current implementation, optimally supporting
  `@electron-forge/publisher-github`. Currently in *concept state* – it will be
  the next thing I will work on once `maker-appimage` will be published.

## License

Unlike Electron Forge, this project has no common license and each tool may be
licensed under its own terms and conditions. Please reffer to each tool's
directory if you want to know more about their licenses