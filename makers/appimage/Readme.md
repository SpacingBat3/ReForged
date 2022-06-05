# `@reforged/maker-appimage`

An unofficial AppImage target *maker* for the [Electron Forge][1]. Designed to
manage tasks asynchroniously and synchronize the tasks only when it is required
for them to finish. A part of the [*Reforged*][2] project.

## Usage:

Please reffer to [Electron Forge documentation][3] if you don't know about
general Electron Forge configuration.

An example relevant part of Electron Forge's configuration for this *maker* may
look like this:
```js
{
    name: "@reforged/maker-appimage",
    config: {
        options: {
            // A name that can be applied to the executable name.
            name: "example-app",
            // Human-friendly name of the application.
            productName: "Example Electron Application",
            // `GenericName` in generated `.desktop` file.
            genericName: "Example application",
            // Path to application's icon.
            icon: "/path/to/icon.png",
            // `Categories` in generated `.desktop` file.
            categories: [ "Utility" ]
        }
    }
}
```

You may also import types from `@reforged/maker-appimage/types/config` if you
wish to verify Electron Forge configuration with TypeScript and access JSDoc
comments in your editor if it supports them.

[1]: https://github.com/electron-userland/electron-forge
[2]: https://github.com/SpacingBat3/ReForged
[3]: https://www.electronforge.io/configuration