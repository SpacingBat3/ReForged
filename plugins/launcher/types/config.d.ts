

/** Configuration definition of `@reforged/plugin-launcher`. */
export default interface PluginLauncherConfig {
  /**
   * Multi-type option, defining an executable that will be used to
   * wrap the original binary with. This option can reflect:
   *
   * - an inline shebang-prefixed script content (`string` or
   *   array of script lines, for convenience),
   *
   * - an inline binary executable, doesn't have to be shebanged
   *   but needs to be recognized by the kernel (binfmt on Linux for
   *   non-native executables),
   *
   * - a path to the external file that can be both of the above.
   *
   * @fixme This needs a syntax to separate platforms and architectures,
   * especially for binary executables as these tend to be both platform
   * and architecture agnostic.
   */
  launcher: string|[`#!${string}`,...string[]]|NodeJS.ArrayBufferView
}

export { PluginLauncherConfig }