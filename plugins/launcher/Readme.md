# `@reforged/plugin-launcher`

An [Electron Forge][1] plugin to wrap [Electron][2] applications into
shebang-prefixed script files and native OS executables. At the current state,
application developers are responsible for resolving path to your Electron
application and handling script real path when it is being symlinked. Plugin
also only deals with Linux only for the time being.

> [!CAUTION]
> We are currently at **initial release cycle**, therefore **no API stability**
> guarantees are made! Far more code infrastructure needs implementation
> as well, including but not exclusively: unit tests, documentation,
> use case consideration, multiplatform and multiarch packaging support,
> logging and planned feature definition.
>
> Mature **stable release** will begin at v1 versioning, [as defined by SemVer
> specification][3].

## Usage:

Currently, plugin configuration supports one property that must be set:
`launcher`. It is a multi-type property and can be:

- a `string`, pointing to a file that will replace the binary when starting
  application,
- a shebang-prefixed `string` or `string[]` (where array contains individual
  lines), to provide an inline script that will be used as an entrypoint of
  your application,
- an `ArrayBufferView` (e.g. `Uint8Array`, `Buffer` instances), that represents
  an embedded version of your binary.

Example relevant Electron Forge configuration:
```js
/// forge.config.mjs
import PluginLauncher from "@reforged/plugin-launcher"

const config = {
    /* (…) */
    plugins: [
        /* Note: PluginLauncher has to be the last element! */
        new PluginLauncher({ launcher: [
            '#!/bin/sh',
            'ME="$(readlink -f "$0")"',
            'echo "Hello, plugin world!"',
            'exec "$ME.bin" "$@"'
        ]})
    ]
}
```

[1]: https://www.electronforge.io/
[2]: https://www.electronjs.org/
[3]: https://semver.org/#spec-item-4
