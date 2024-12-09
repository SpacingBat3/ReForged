/*
 * Test current maker from perspective of its structure, aiding what's
 * currently tested by TypeScript and precising the expectancies in APIs
 * even more than it is currently.
 */

import { describe, it } from "node:test";

import assert from "node:assert";
import MakerAppImage from "@reforged/maker-appimage";

describe("MakerAppImage has valid structure", () => {
  const maker = new MakerAppImage();
  const proto = MakerAppImage.prototype;

  it("extends MakerBase object directly", async() => {
    const { MakerBase } = await import("@electron-forge/maker-base");
    assert.strictEqual(Object.getPrototypeOf(MakerAppImage),MakerBase);
  })
  it("has the same name as the name of the distributable format", () => {
    assert.strictEqual(maker.name,"AppImage");
  })
  it("supports being built on Linux only by the default", () => {
    assert.deepStrictEqual(maker.defaultPlatforms,["linux"])
  })
  
  describe("has a 'make' method", () => {
    it("is defined in class prototype", () => {
      assert.ok("make" in proto);
      assert.notStrictEqual(proto.make??undefined, undefined);
    })
    it("is an asynchronous function", () => {
      assert.strictEqual(proto.make.constructor, (async()=>{}).constructor);
    })
    it("requires at least one argument", () => {
      assert.strictEqual(proto.make.length, 1);
    })
  })
})