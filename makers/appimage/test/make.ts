/*
 * Test current maker from perspective of 'make' process.
 * ---
 * TODO: Consider full mocking of test env for runtime-independent
 * testing, including:
 *
 * - File system access.
 * - "mksquashfs" binary.
 *
 * Maybe do it as some kind of Forge-standard mocking env for Node's
 * testing? Or create a shared local module with such implementation?
 *
 * Right now, we're skipping tests if local env is not satisfied.
 */

import {
  access,
  constants,
  mkdtemp,
  open,
  rm,
  writeFile
} from "node:fs/promises";

import { describe, it } from "node:test"
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";


import assert from "node:assert";
import MakerAppImage from "@reforged/maker-appimage";

import type { ForgeArch } from "@reforged/maker-appimage";

/** Maker to test. */
const maker = new MakerAppImage();
await maker.prepareConfig(process.arch);

// Mock app metadata
const packageJSON = {
  name:"mock-app",
  productName: "Mock Electron App",
  version:"0.0.0-mock"
}
const mockAppPath = mkdtemp(resolve(tmpdir(),`${packageJSON.name}-src-`))
// Initialize mock application data
  .then(path => {
    // Mock executable.
    writeFile(resolve(path,packageJSON.name),[
      "#!/usr/bin/sh -e",
      "echo 'Hello world!';"
    ].join("\n"),{ mode:0o755 })
    return path;
  });
const mockMkPath = mkdtemp(resolve(tmpdir(),`${packageJSON.name}-make-`));
const forgeConfig = {
  makers:[maker],
  plugins:[],
  publishers:[],
  packagerConfig:{},
  rebuildConfig:{},
  get pluginInterface():never {
    throw new Error("Unsupported mock property access: 'pluginInterface'.");
  }
}

/** Cleanup hook after Electron mock make process. */
async function cleanup() {
  rm(await mockAppPath,{recursive:true});
  rm(await mockMkPath,{recursive:true});
}

//
let AResolve: (arg0: string) => any, AReject: (reason?: unknown) => void;
const AppImageDir:Promise<string> = new Promise(
  (resolve,reject) => { AResolve = resolve, AReject = reject }
);


describe("MakerAppimage is working correctly", {
  skip: maker.isSupportedOnCurrentPlatform() ?
    maker.externalBinariesExist() ?
    false :
    `One or more binaries are missing: ${maker.requiredExternalBinaries.join(', ')}` :
    `Unsupported platform: ${process.platform}-${process.arch}`
}, () => {
  it("should create valid AppImage binary", async() => {
    maker.make({
      packageJSON,
      forgeConfig,
      appName: packageJSON.productName,
      dir: await mockAppPath,
      makeDir: await mockMkPath,
      targetArch: process.arch as ForgeArch,
      targetPlatform: process.platform
    }).then(dir => AResolve(dir[0]),reason => AReject(reason));

    await assert.doesNotReject(AppImageDir);

    assert.strictEqual(
      await AppImageDir,
      resolve(
        await mockMkPath,
        maker.name,
        process.arch,
        `${packageJSON.productName}-${packageJSON.version}-${process.arch}.AppImage`
      )
    )
  });

  it("should resulting AppImage be an ELF file", async() => {
    const fd = await open(await AppImageDir);
    const buff = new Uint8Array(8);
    await fd.read(buff,0,8);
    assert.strictEqual(
      [...buff].map(v=>v.toString(16)).join(' '),
      // ELF magic HEX
      "7f 45 4c 46 2 1 1 0"
    )
    fd.close();
  })

  it("should AppImage be runnable and working fine", async ctx => {
    const exec = promisify(execFile);
    // Skip this test for non-exec tmpdir.
    if(await access(await AppImageDir,constants.X_OK).then(_=>false,_=>true))
      return ctx.skip("Non-executable tmpdir.");
    const cp = exec(await AppImageDir)
    await assert.doesNotReject(cp);
    assert.strictEqual((await cp).stdout,"Hello world!\n")
  })
}).then(cleanup);