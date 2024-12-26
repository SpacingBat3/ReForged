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
  readdir,
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
const
  packageJSON = {
    name:"mock-app",
    productName: "Mock Electron App",
    version:"0.0.0-mock"
  },
  // Valid mock Forge config
  forgeConfig = {
    makers: [maker],
    plugins: [],
    publishers: [],
    packagerConfig: {},
    rebuildConfig: {},
    get pluginInterface():never {
      throw new Error("Unsupported mock property access: 'pluginInterface'.");
    }
  },
  mockMkPath = mkdtemp(resolve(tmpdir(),`${packageJSON.name}-make-`)),
  mockAppPath = mkdtemp(resolve(tmpdir(),`${packageJSON.name}-src-`))
  // Initialize mock application data
    .then(path => {
      // Mock executable.
      writeFile(resolve(path,packageJSON.name),[
        "#!/usr/bin/sh -e",
        "echo 'Hello world!';"
      ].join("\n"),{ mode:0o755 })
      return path;
    });



/** Cleanup hook after Electron mock make process. */
async function cleanup() {
  const promises = new Array<Promise<void>>();
  promises.push(rm(await mockAppPath,{recursive:true}));
  promises.push(rm(await mockMkPath,{recursive:true}));
  await Promise.allSettled(promises);
}

/** Suite promises */
const suites:Promise<void>[] = [];

/** Whenever to skip functional tests (and a reason to do so). */
const skip = maker.isSupportedOnCurrentPlatform() ?
  maker.externalBinariesExist() ?
  false :
  `One or more binaries are missing: ${maker.requiredExternalBinaries.join(', ')}` :
  `Unsupported platform: ${process.platform}-${process.arch}`;

suites.push(describe("MakerAppimage is working correctly", {skip}, () => {
  let AResolve: (arg0: string) => any, AReject: (reason?: unknown) => void;
  /** Resolved output of successful make, to re-use it in another tests. */
  const AppImageDir:Promise<string> = new Promise(
    (resolve,reject) => { AResolve = resolve, AReject = reject }
  );

  it("creates valid AppImage binary", async() => {
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

  it("cleans-up workDir after completion", async () => {
    await AppImageDir;
    assert.ok(
      // We know workDir is somewhere in tmpdir, but not really its exact path.
      // Hence fail for all possible workDir matches.
      !(await readdir(tmpdir()))
        .some(dir => dir.startsWith(`.${packageJSON.productName}-${packageJSON.version}-${process.arch}-`))
    )
  })

  it("outputs AppImage that is an ELF file", async() => {
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

  it("outputs AppImage that is runnable and working fine", async ctx => {
    const exec = promisify(execFile);
    // Skip this test for non-exec tmpdir.
    if(await access(await AppImageDir,constants.X_OK).then(_=>false,_=>true))
      return ctx.skip("Non-executable tmpdir.");
    const cp = exec(await AppImageDir)
    await assert.doesNotReject(cp);
    assert.strictEqual((await cp).stdout,"Hello world!\n")
  })
}));

suites.push(describe("MakerAppImage fails for invalid cases", {skip}, () => {
  /** List of validation functions for error rejections. */
  const err = {
    noExecutable: (err:Error|null|undefined) => {
      assert.strictEqual(err?.constructor, Error);
      assert.strictEqual(err?.name, "Error");
      assert.ok(String.prototype.startsWith.call(
        err.message,
        "Could not find executable"
      ));
      return true;
    },
    unsupportedArch: (err:Error|null|undefined) => {
      assert.strictEqual(err?.constructor, Error);
      assert.strictEqual(err.name, "Error");
      assert.strictEqual(
        err.message,
        "Unsupported architecture: 'wrong-arch'."
      )
      return true;
    }
  }

  it("rejects when configured binary name does not exist", async() => {
    const maker = new MakerAppImage({options:{bin:"invalid"}});
    await maker.prepareConfig(process.arch);
    const failedAttempt = maker.make({
      packageJSON,
      forgeConfig,
      appName: packageJSON.productName,
      dir: await mockAppPath,
      makeDir: await mockMkPath,
      targetArch: process.arch as ForgeArch,
      targetPlatform: process.platform
    });
    await assert.rejects(failedAttempt, err.noExecutable);
  })

  it("rejects when path to the app does not exist", async() => {
    const failedAttempt = maker.make({
      packageJSON,
      forgeConfig,
      appName: packageJSON.productName,
      dir: resolve("/","invalid"),
      makeDir: await mockMkPath,
      targetArch: process.arch as ForgeArch,
      targetPlatform: process.platform
    });
    await assert.rejects(failedAttempt, err.noExecutable);
  }),

  it("rejects an error for invalid architectures", async() => {
    const failedAttempt = maker.make({
      packageJSON,
      forgeConfig,
      appName: packageJSON.productName,
      dir: await mockAppPath,
      makeDir: await mockMkPath,
      targetArch: "wrong-arch" as ForgeArch,
      targetPlatform: process.platform
    });
    await assert.rejects(failedAttempt, err.unsupportedArch);
  })
}));

await Promise.all(suites).finally(() => cleanup());