import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountPlayground } from "../src/app/playground.js";

describe("ToastCraft interactive playground", () => {
  let root;
  let controller;

  beforeEach(() => {
    vi.useFakeTimers();
    root = document.createElement("div");
    document.body.appendChild(root);
    controller = mountPlayground(root);
  });

  afterEach(() => {
    controller?.destroy();
    controller = null;
    root?.remove();
    vi.useRealTimers();
  });

  it("renders controls, live code snippet, and updates telemetry when triggering a toast", () => {
    const activeCount = root.querySelector('[data-role="active-count"]');
    const historyCount = root.querySelector('[data-role="history-count"]');
    const codeOutput = root.querySelector('[data-role="code-output"]');

    expect(activeCount.textContent).toBe("0");
    expect(codeOutput.textContent).toContain("createToaster");

    const form = root.querySelector('[data-role="builder-form"]');
    form.dispatchEvent(new Event("submit", { cancelable: true }));

    expect(activeCount.textContent).toBe("1");
    expect(historyCount.textContent).toBe("1");
    expect(document.querySelectorAll(".tc-toast")).toHaveLength(1);
  });

  it("updates theme, position, and clears active toasts", () => {
    const themeButtons = [...root.querySelectorAll('[data-role="theme-group"] button')];
    const darkBtn = themeButtons.find((btn) => btn.textContent === "Dark");
    darkBtn.click();

    expect(document.documentElement.dataset.appTheme).toBe("dark");

    const posButtons = [...root.querySelectorAll('[data-role="position-group"] button')];
    const topLeftBtn = posButtons.find((btn) => btn.textContent === "Top Left");
    topLeftBtn.click();

    const codeOutput = root.querySelector('[data-role="code-output"]');
    expect(codeOutput.textContent).toContain('"top-left"');
    expect(codeOutput.textContent).toContain('"dark"');

    root.querySelector('[data-action="classic"]').click();
    vi.advanceTimersByTime(600);
    expect(controller.toaster.getToasts()).toHaveLength(2);

    root.querySelector('[data-action="clear"]').click();
    expect(controller.toaster.getToasts()).toHaveLength(0);
  });

  it("cancels pending burst timers when Clear All is clicked", () => {
    root.querySelector('[data-action="burst"]').click();
    vi.advanceTimersByTime(180);
    expect(controller.toaster.getToasts()).toHaveLength(2);

    root.querySelector('[data-action="clear"]').click();
    expect(controller.toaster.getToasts()).toHaveLength(0);

    vi.advanceTimersByTime(1000);
    expect(controller.toaster.getToasts()).toHaveLength(0);
  });
});
