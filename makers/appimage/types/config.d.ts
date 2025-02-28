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
     * A file location, from which runtime should be fetched. Can be remote URL
     * that is supported by Node.js `fetch` or file path.
     *
     * Default is generated as:
     * ```js
     * `https://github.com/AppImage/type2-runtime/releases/download/continuous/runtime-${arch}`
     * ```
     */
    runtime?: string|URL
}

interface MakerAppImageConfig extends MakerConfig<MakerAppImageConfigOptions> {}

export default MakerAppImageConfig;
export { MakerAppImageConfig, MakerAppImageConfigOptions }