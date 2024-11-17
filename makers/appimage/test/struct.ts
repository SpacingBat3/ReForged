/*
 * Test current maker from perspective of its structure, aiding what's
 * currently tested by TypeScript and precising the expectancies in APIs
 * even more than it is currently.
 */

import { describe, it } from "node:test";

import assert from "node:assert";
import MakerAppImage from "@reforged/maker-appimage";

describe("MakerAppImage is valid object", () => {
  const maker = new MakerAppImage();

  it("extends MakerBase object directly", async() => {
    const { MakerBase } = await import("@electron-forge/maker-base");
    assert.strictEqual(Object.getPrototypeOf(MakerAppImage),MakerBase);
  })

  it("has name of the distributable format, AppImage", () => {
    assert.strictEqual(maker.name,"AppImage");
  })

  it("supports being built on Linux only by the default", () => {
    assert.deepStrictEqual(maker.defaultPlatforms,["linux"])
  })

  it("has a 'make' method", async ctx => {
    await ctx.test("should be an asynchronous function", () => {
      assert.strictEqual(maker.make.constructor, (async()=>{}).constructor);
    })
    await ctx.test("should be given at least one argument", () => {
      assert.strictEqual(maker.make.length, 1);
    })
  })
})