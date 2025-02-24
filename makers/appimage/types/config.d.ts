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
     * GitHub Release of `AppImage/AppImageKit` from which this maker should
     * get the runtime and AppRun executable.
     *
     * Defaults to `13`.
     *
     * @since v1.1.0
     */
    AppImageKitRelease?: number | `${number}` | "continuous",
    /**
     * Whenever to emulate support for Arch Linux `{name}-flags.conf` file,
     * which contains additional flags prepended to ARGV when executing
     * Electron binary by the shell script. This should be compatible with the
     * file format described in [this Arch Wiki section][wiki].
     *
     * [wiki]: https://wiki.archlinux.org/index.php?title=Chromium&oldid=776126#Making_flags_persistent
     */
    flagsFile?: boolean,
    /**
     * Whenever to use the new experimental statically-linked runtime executable.
     * This implies {@linkcode AppImageKitRelease} is set to `"continuous"`.
     *
     * **This option is highly experimental and might break after changes in
     * `AppImage/type2-runtime` repo will be deleted or merged to
     * `AppImage/AppImageKit`!**
     *
     * Default is `false`.
     *
     * @experimental
     */
    type2runtime?: boolean
}
interface MakerAppImageConfig extends MakerConfig<MakerAppImageConfigOptions> {}

export default MakerAppImageConfig;
export { MakerAppImageConfig, MakerAppImageConfigOptions }