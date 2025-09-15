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
  chmod,
  constants,
  lstat,
  mkdtemp,
  open,
  readdir,
  readlink,
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
import type { IconSet   } from "@reforged/maker-types";

const icon: IconSet = {};

const icons = Object.freeze([
  ["scalable","svg"],
  ["1024x1024","png"]
] as const);

for(const str of icons)
  icon[str[0]] = resolve(import.meta.dirname,`res/empty_${str[0]}.${str[1]}`);

/** Maker to test. */
const maker = new MakerAppImage({ options: { icon } });
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

suites.push(describe("MakerAppimage is working correctly", {skip}, async() => {
  await it("successfully creates AppImage binary in predictable path", async(ctx) => {
    const AppImageDir = maker.make({
      packageJSON,
      forgeConfig,
      appName: packageJSON.productName,
      dir: await mockAppPath,
      makeDir: await mockMkPath,
      targetArch: process.arch as ForgeArch,
      targetPlatform: process.platform
    }).then(([path]) => path);
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
    ctx.test("that is an ELF file", async() => {
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
    ctx.test("that is runnable and working fine", async ctx => {
      const exec = promisify(execFile);
      const AppImage = await AppImageDir
      // Skip this test for non-exec tmpdir.
      if(await access(AppImage,constants.X_OK).then(_=>false,_=>true)) {
        await chmod(AppImage,0o755);
        return access(AppImage,constants.X_OK).then(
          ()=>Promise.reject("Maker failed to set exec permissions"),
          ()=>ctx.skip("Non-executable tmpdir.")
        );
      }
      const cp = exec(AppImage)
      await assert.doesNotReject(cp);
      assert.strictEqual((await cp).stdout,"Hello world!\n")
    })
    ctx.test("that contains valid icon hierarchy", async ctx => {
      const AppImage = await AppImageDir
      // Skip this test for non-exec tmpdir (due to appimage mounting).
      if(await access(AppImage,constants.X_OK).then(_=>false,_=>true)) {
        await chmod(AppImage,0o755);
        return access(AppImage,constants.X_OK).then(
          ()=>Promise.reject("Maker failed to set exec permissions"),
          ()=>ctx.skip("Non-executable tmpdir.")
        );
      }
      const cp = execFile(AppImage, ["--appimage-mount"])
      // Wait for mountpoint.
      const mount = await new Promise<string>((resolve) => {
        let data = "";
        cp.stdout?.once("data", (chunk:string) => {
          data+=String(chunk);
          if(data.includes("\n")) resolve(data.trimEnd())
        })
        cp.stdout?.once("end", () => resolve(data))
        cp.stdout?.once("close",() => resolve(data));
      })
      // Do FS checks
      assert.ok(mount);
      const test = [];
      test.push(ctx.test("with top-level symlinks", async () => {
        const promises: Promise<unknown>[] = [];
        for(const path of [".DirIcon",`${packageJSON.name}.svg`]) {
          const file = resolve(mount,path);
          promises.push(Promise.all([lstat(file),readlink(file)]).then(([stats,link]) => {
            assert.ok(stats.isSymbolicLink(),`${path} is not symlink`);
            // Check if default icon is scalable
            assert.strictEqual(
              link,
              `usr/share/icons/hicolor/scalable/apps/${packageJSON.name}.svg`
            );
          }));
        }
        await Promise.all(promises);
      }))
      test.push(ctx.test("with icons in 'usr/share/icons'", async () => {
        const promises: Promise<unknown>[] = [];
        for(const path of icons)
          promises.push(assert.doesNotReject(access(
            resolve(mount,"usr/share/icons/hicolor",path[0],"apps",`${packageJSON.name}.${path[1]}`),
            constants.R_OK
          )));
        await Promise.all(promises);
      }))
      try {
        assert.ok(mount);
        await Promise.all(test);
      } catch(err) {
        cp.kill();
        throw err;
      }
      cp.kill();
    })
  })
  it("cleans-up working directory after completion", async () => {
    assert.ok(
      // We know workDir is somewhere in tmpdir, but not really its exact path.
      // Hence fail for all possible workDir matches.
      !(await readdir(tmpdir()))
        .some(dir => dir.startsWith(`.${packageJSON.productName}-${packageJSON.version}-${process.arch}-`))
    )
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