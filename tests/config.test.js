import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  normalizeConfig,
  normalizeToastInput,
  resolveDuration,
  resolvePosition,
} from "../src/index.js";

describe("config utilities", () => {
  it("resolves valid modern positions and falls back on invalid values", () => {
    expect(resolvePosition({ position: "top-center" })).toBe("top-center");
    expect(resolvePosition({ position: "middle-nowhere" })).toBe(DEFAULT_CONFIG.position);
  });

  it("maps legacy positionX and positionY coordinates", () => {
    expect(resolvePosition({ positionX: "left", positionY: "top" })).toBe("top-left");
    expect(resolvePosition({ positionX: "center", positionY: "top" })).toBe("top-center");
    expect(resolvePosition({ positionX: "right", positionY: "bottom" })).toBe("bottom-right");
  });

  it("converts legacy seconds duration when positionX/positionY are provided", () => {
    expect(resolveDuration({ positionX: "right", positionY: "bottom", duration: 3 })).toBe(3000);
    expect(resolveDuration({ duration: 4500 })).toBe(4500);
    expect(resolveDuration({ durationMs: 2500, duration: 10 })).toBe(2500);
  });

  it("treats zero, null, and Infinity durations as persistent", () => {
    expect(resolveDuration({ duration: 0 })).toBe(Infinity);
    expect(resolveDuration({ duration: null })).toBe(Infinity);
    expect(resolveDuration({ duration: Infinity })).toBe(Infinity);
  });

  it("normalizes and clamps global config bounds", () => {
    const config = normalizeConfig({
      theme: "dark",
      position: "top-right",
      maxVisible: 99,
      exitDuration: -10,
      pauseOnHover: false,
    });

    expect(config).toEqual({
      position: "top-right",
      theme: "dark",
      duration: DEFAULT_CONFIG.duration,
      maxVisible: 20,
      exitDuration: 0,
      dismissible: true,
      pauseOnHover: false,
      showProgress: true,
      newestOnTop: true,
    });
  });

  it("returns null for empty toast inputs and sets safe defaults for loading", () => {
    expect(normalizeToastInput("")).toBeNull();
    expect(normalizeToastInput("   ", { title: "  " })).toBeNull();

    const loadingPayload = normalizeToastInput({
      message: "Uploading...",
      variant: "loading",
    });

    expect(loadingPayload.duration).toBe(Infinity);
    expect(loadingPayload.dismissible).toBe(false);
  });
});
