# `@reforged/maker-appimage`

A simple, asynchronous [AppImage][5] maker for the [Electron Forge][1].
Basically reimplementation of `appimagetool` in TypeScript, but using
system-wide `mksquashfs` and written natively for the Forge API. It also has
some potential to support packaging AppImage-alternative formats as well (right
now, custom runtimes are supported only). A part of the [Reforged][2] project.

## Usage:

Please refer to [Electron Forge documentation][3] if you don't know about
general Electron Forge configuration.

Configuration options for this maker are documented in [`MakerAppImageConfig`][4].

```js
{
  name: "@reforged/maker-appimage"
  config: {
    options: {
      categories: ["Network"],
      icon: "path/to/icon.svg"
    }
  }
}
```

[1]: https://github.com/electron/forge
[2]: https://github.com/SpacingBat3/ReForged
[3]: https://www.electronforge.io/configuration
[4]: https://spacingbat3.github.io/ReForged/interfaces/_reforged_maker-appimage.MakerAppImageConfig.html
[5]: https://appimage.org