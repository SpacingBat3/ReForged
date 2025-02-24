import {MakerConfig, MakerUnixOptions} from "@reforged/maker-types"

interface MakerAppImageConfigOptions extends MakerUnixOptions {
    /**
     * Whenever calculate and embed MD5 digest in the runtime.
     *
     * Currently functions as a placeholder for future API – **NO-OP**.
     *
     * @internal
     * @experimental
     */
    digestMd5?: boolean,
    /**
     * Use given compressor for SquashFS filesystem.
     *
     * Defaults to `mksquashfs` binary defaults (usually `gzip`).
     *
     * @since v2.1.0
     */
    compressor?: "xz"|"gzip"|"lz4"|"lzo"|"zstd"|"lzma"
    /**
     * GitHub Release of repository, from which runtime will be fetched.
     *
     * Defaults to `continuous`.
     *
     * @since v1.1.0
     * @deprecated Use {@linkcode runtime} instead
     */
    AppImageKitRelease?: number | `${number}` | "continuous",
    /**
     * Whenever to emulate support for Arch Linux `{name}-flags.conf` file,
     * which contains additional flags prepended to ARGV when executing
     * Electron binary by the shell script. This should be compatible with the
     * file format described in [this Arch Wiki section][wiki].
     *
     * [wiki]: https://wiki.archlinux.org/index.php?title=Chromium&oldid=776126#Making_flags_persistent
     *
     * @deprecated Will be replaced by plugin
     */
    flagsFile?: boolean,
    /**
     * Whenever to use the new statically-linked runtime executable.
     * Depends on condition `AppImageKitRelease === "continuous"` being
     * fulfilled.
     *
     * Default is `true`.
     * @requires
     * @deprecated Use {@linkcode runtime} instead
     */
    type2runtime?: boolean,
    /**
     * A file location, from which runtime should be fetched. Can be remote URL
     * that is supported by Node.js `fetch` or file path.
     *
     * Default is `"https://github.com/AppImage/type2-runtime/releases/download/continuous/runtime-"+arch`
     */
    runtime?: string|URL
}

interface MakerAppImageConfig extends MakerConfig<MakerAppImageConfigOptions> {}

export default MakerAppImageConfig;
export { MakerAppImageConfig, MakerAppImageConfigOptions }