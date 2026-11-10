import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createToaster } from "../src/index.js";

describe("createToaster", () => {
  let toaster;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    toaster?.destroy();
    toaster = null;
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("supports the legacy createToaster(config)(message) API with seconds duration", () => {
    toaster = createToaster({
      positionX: "right",
      positionY: "bottom",
      theme: "light",
      duration: 3,
      exitDuration: 0,
    });

    const id = toaster("Download Done");
    expect(id).toBeTruthy();

    const toastEl = document.querySelector(`[data-toast-id="${id}"]`);
    expect(toastEl).not.toBeNull();
    expect(toastEl.textContent).toContain("Download Done");
    expect(toastEl.dataset.theme).toBe("light");
    expect(toastEl.closest('[data-position="bottom-right"]')).not.toBeNull();

    vi.advanceTimersByTime(2999);
    expect(toaster.getToasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(toaster.getToasts()).toHaveLength(0);
    expect(document.querySelector(`[data-toast-id="${id}"]`)).toBeNull();
  });

  it("renders user text safely without interpreting HTML tags", () => {
    toaster = createToaster({ exitDuration: 0 });
    const malicious = '<img src="x" onerror="alert(1)">Hello';
    const id = toaster.info(malicious, { title: "<b>Alert</b>" });

    const toastEl = document.querySelector(`[data-toast-id="${id}"]`);
    expect(toastEl.querySelector("img")).toBeNull();
    expect(toastEl.querySelector("b")).toBeNull();
    expect(toastEl.textContent).toContain(malicious);
    expect(toastEl.textContent).toContain("<b>Alert</b>");
  });

  it("assigns appropriate ARIA roles for assertive vs polite variants", () => {
    toaster = createToaster({ exitDuration: 0 });
    const errorId = toaster.error("Failed to save");
    const infoId = toaster.info("Saved draft");

    const errorEl = document.querySelector(`[data-toast-id="${errorId}"]`);
    const infoEl = document.querySelector(`[data-toast-id="${infoId}"]`);

    expect(errorEl.getAttribute("role")).toBe("alert");
    expect(errorEl.getAttribute("aria-live")).toBe("assertive");
    expect(infoEl.getAttribute("role")).toBe("status");
    expect(infoEl.getAttribute("aria-live")).toBe("polite");
  });

  it("enforces maxVisible stack limits per container", () => {
    toaster = createToaster({ maxVisible: 2, exitDuration: 0, duration: 5000 });

    const id1 = toaster("First");
    const id2 = toaster("Second");
    const id3 = toaster("Third");

    const activeIds = toaster.getToasts().map((t) => t.id);
    expect(activeIds).toEqual([id2, id3]);
    expect(document.querySelector(`[data-toast-id="${id1}"]`)).toBeNull();
  });

  it("pauses and resumes auto-dismiss accurately on hover and focus", () => {
    toaster = createToaster({ duration: 4000, exitDuration: 0, pauseOnHover: true });
    const id = toaster.success("Hover me");
    const toastEl = document.querySelector(`[data-toast-id="${id}"]`);

    vi.advanceTimersByTime(1500);
    toastEl.dispatchEvent(new Event("mouseenter"));
    expect(toastEl.dataset.paused).toBe("true");

    vi.advanceTimersByTime(6000);
    expect(toaster.getToasts()).toHaveLength(1);

    toastEl.dispatchEvent(new Event("mouseleave"));
    expect(toastEl.dataset.paused).toBe("false");

    vi.advanceTimersByTime(2499);
    expect(toaster.getToasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(toaster.getToasts()).toHaveLength(0);
  });

  it("supports manual dismiss button, action button, and Escape key", () => {
    const onUndo = vi.fn();
    toaster = createToaster({ duration: Infinity, exitDuration: 0 });

    const id1 = toaster("Archived item", {
      action: { label: "Undo", onClick: onUndo },
    });
    const id2 = toaster("Newest item");

    const toast1 = document.querySelector(`[data-toast-id="${id1}"]`);
    toast1.querySelector(".tc-toast__action").click();
    expect(onUndo).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(toaster.getToasts().map((t) => t.id)).toEqual([id1]);
    expect(document.querySelector(`[data-toast-id="${id2}"]`)).toBeNull();

    toast1.querySelector(".tc-toast__close").click();
    expect(toaster.getToasts()).toHaveLength(0);
  });

  it("transitions loading to success or error with toaster.promise()", async () => {
    toaster = createToaster({ duration: 3000, exitDuration: 0 });

    let resolveTask;
    const pending = new Promise((resolve) => {
      resolveTask = resolve;
    });

    const tracked = toaster.promise(pending, {
      loading: "Saving...",
      success: (res) => `Saved ${res.count} items`,
      error: "Save failed",
    });

    expect(toaster.getToasts()[0].variant).toBe("loading");
    resolveTask({ count: 5 });

    await expect(tracked).resolves.toEqual({ count: 5 });
    expect(toaster.getToasts()[0].variant).toBe("success");
    expect(toaster.getToasts()[0].message).toBe("Saved 5 items");

    const failing = Promise.reject(new Error("Network offline"));
    await expect(
      toaster.promise(failing, {
        loading: "Retrying...",
        success: "Done",
        error: (err) => err.message,
      })
    ).rejects.toThrow("Network offline");

    const errorToast = toaster.getToasts().find((t) => t.variant === "error");
    expect(errorToast.message).toBe("Network offline");
  });

  it("keeps toast paused if hovered before an async promise resolves", async () => {
    toaster = createToaster({ duration: 2000, exitDuration: 0, pauseOnHover: true });

    let resolveTask;
    const pending = new Promise((resolve) => {
      resolveTask = resolve;
    });

    const tracked = toaster.promise(pending, {
      loading: "Processing...",
      success: "Finished",
      error: "Failed",
    });

    const toastEl = document.querySelector(".tc-toast");
    toastEl.dispatchEvent(new Event("mouseenter"));

    resolveTask("ok");
    await tracked;

    expect(toastEl.dataset.paused).toBe("true");
    vi.advanceTimersByTime(5000);
    expect(toaster.getToasts()).toHaveLength(1);

    toastEl.dispatchEvent(new Event("mouseleave"));
    vi.advanceTimersByTime(2000);
    expect(toaster.getToasts()).toHaveLength(0);
  });

  it("notifies subscribers and tears down cleanly on destroy()", () => {
    toaster = createToaster({ exitDuration: 200 });
    const listener = vi.fn();
    const unsubscribe = toaster.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);

    toaster.info("First");
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1][0].active).toHaveLength(1);

    unsubscribe();
    toaster.info("Second");
    expect(listener).toHaveBeenCalledTimes(2);

    toaster.destroy();
    expect(document.querySelectorAll(".tc-container")).toHaveLength(0);
    expect(toaster.show("After destroy")).toBeNull();
  });

  it("allows reusing an explicit toast id while the previous toast is exiting", () => {
    toaster = createToaster({ exitDuration: 220, duration: 5000 });

    toaster.info("First save", { id: "save-status" });
    toaster.dismiss("save-status");

    const reusedId = toaster.success("Second save", { id: "save-status" });
    expect(reusedId).toBe("save-status");
    expect(toaster.getToasts()).toHaveLength(1);
    expect(toaster.getToasts()[0].message).toBe("Second save");
    expect(document.querySelectorAll('[data-toast-id="save-status"]')).toHaveLength(1);
  });
});
