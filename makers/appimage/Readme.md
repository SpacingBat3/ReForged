# `@reforged/maker-appimage`

An unofficial AppImage target *maker* for the [Electron Forge][1]. Designed to
manage tasks asynchroniously and synchronize the tasks only when it is required
for them to finish. A part of the [*Reforged*][2] project.

## Usage:

Please refer to [Electron Forge documentation][3] if you don't know about
general Electron Forge configuration.

The maker itself should work *out-of-the-box* (i.e. you don't have to pass any
options to it, you only need to add it to Forge config so it will be used),
although it is recommended to at least provide the path of the icon and
`categories` for best end-user experience. An example relevant part of Electron
Forge's configuration for this *maker* may look like this:

```js
import { MakerAppImage } from "@reforged/maker-appimage";
/* (...) */
const forgeConfig = {
  /* (...) */
  makers: [
    /* (...) */
    new MakerAppImage({
      options: {
        // Package name.
        name: "example-app",
        // Executable name.
        bin: "app",
        // Human-friendly name of the application.
        productName: "Example Electron Application",
        // `GenericName` in generated `.desktop` file.
        genericName: "Example application",
        // Path to application's icon.
        icon: "/path/to/icon.png",
        // Desktop file to be used instead of the configuration above.
        desktopFile: "/path/to/example-app.desktop",
        // Release of `AppImage/AppImageKit`, either number or "continuous".
        AppImageKitRelease: "continuous",
        // Support parsing Arch Linux '*_flags.conf' file.
        flagsFile: "true"
      }
    })
  ]
}
```

[1]: https://github.com/electron/forge
[2]: https://github.com/SpacingBat3/ReForged
[3]: https://www.electronforge.io/configuration