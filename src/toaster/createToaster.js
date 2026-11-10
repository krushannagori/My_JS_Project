import { normalizeConfig, normalizeToastInput } from "./config.js";
import { DEFAULT_CONFIG } from "./constants.js";
import { createIconElement } from "./icons.js";

const MAX_HISTORY_ENTRIES = 30;

function getAriaAttributes(variant) {
  if (variant === "error" || variant === "warning") {
    return { role: "alert", ariaLive: "assertive" };
  }
  return { role: "status", ariaLive: "polite" };
}

function toPublicToast(record) {
  return {
    id: record.id,
    title: record.payload.title,
    message: record.payload.message,
    variant: record.payload.variant,
    theme: record.payload.theme,
    position: record.payload.position,
    duration: record.payload.duration,
    dismissible: record.payload.dismissible,
    pauseOnHover: record.payload.pauseOnHover,
    showProgress: record.payload.showProgress,
    createdAt: record.createdAt,
  };
}

function resolveAsyncMessage(spec, value, fallbackText) {
  const resolved = typeof spec === "function" ? spec(value) : spec;
  if (resolved && typeof resolved === "object") {
    return resolved;
  }
  if (typeof resolved === "string" && resolved.trim()) {
    return { message: resolved };
  }
  return { message: fallbackText };
}

/**
 * Creates a reusable, accessible toast notification controller.
 *
 * Returns a callable function `toaster(message, options)` for backward compatibility
 * with `createToaster(config)(message)`, enriched with variant helpers and lifecycle APIs.
 */
export function createToaster(initialConfig = {}) {
  let config = normalizeConfig(initialConfig, DEFAULT_CONFIG);
  let idCounter = 0;
  let destroyed = false;

  const containers = new Map();
  const toasts = new Map();
  const history = [];
  const listeners = new Set();

  let escapeListenerAttached = false;

  function emitState() {
    const snapshot = {
      config: { ...config },
      active: getToasts(),
      history: getHistory(),
    };
    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("Toast subscriber callback failed:", error);
      }
    }
  }

  function recordHistory(event, record, reason = null) {
    history.unshift({
      id: record.id,
      event,
      reason,
      variant: record.payload.variant,
      title: record.payload.title,
      message: record.payload.message,
      position: record.payload.position,
      timestamp: Date.now(),
    });
    if (history.length > MAX_HISTORY_ENTRIES) {
      history.length = MAX_HISTORY_ENTRIES;
    }
  }

  function handleDocumentKeydown(event) {
    if (event.key !== "Escape") {
      return;
    }
    const activeDismissible = [...toasts.values()]
      .reverse()
      .find((record) => !record.exiting && record.payload.dismissible);

    if (activeDismissible) {
      dismiss(activeDismissible.id, "escape");
    }
  }

  function syncEscapeListener() {
    if (typeof document === "undefined") {
      return;
    }
    const hasActiveToasts = [...toasts.values()].some((record) => !record.exiting);

    if (hasActiveToasts && !escapeListenerAttached) {
      document.addEventListener("keydown", handleDocumentKeydown);
      escapeListenerAttached = true;
    } else if (!hasActiveToasts && escapeListenerAttached) {
      document.removeEventListener("keydown", handleDocumentKeydown);
      escapeListenerAttached = false;
    }
  }

  function getOrCreateContainer(position) {
    if (typeof document === "undefined" || !document.body) {
      return null;
    }

    const existing = containers.get(position);
    if (existing && existing.isConnected) {
      return existing;
    }

    const container = document.createElement("div");
    container.className = `tc-container tc-container--${position}`;
    container.dataset.position = position;
    container.setAttribute("role", "region");
    container.setAttribute("aria-label", `Notifications (${position})`);
    document.body.appendChild(container);
    containers.set(position, container);
    return container;
  }

  function cleanupEmptyContainer(position) {
    const container = containers.get(position);
    if (!container) {
      return;
    }
    if (container.childElementCount === 0) {
      if (container.isConnected) {
        container.remove();
      }
      containers.delete(position);
    }
  }

  function removeToastElement(record) {
    if (record.exitTimerId !== null) {
      clearTimeout(record.exitTimerId);
      record.exitTimerId = null;
    }
    if (record.element && record.element.isConnected) {
      record.element.remove();
    }
    toasts.delete(record.id);
    cleanupEmptyContainer(record.payload.position);
    syncEscapeListener();
  }

  function startTimer(record) {
    if (record.exiting || record.payload.duration === Infinity) {
      return;
    }
    if (record.timerId !== null) {
      clearTimeout(record.timerId);
    }
    record.paused = false;
    record.startedAt = Date.now();
    record.element.dataset.paused = "false";
    record.timerId = setTimeout(() => {
      dismiss(record.id, "timeout");
    }, record.remainingMs);
  }

  function pauseTimer(record) {
    if (record.paused || record.exiting || record.payload.duration === Infinity) {
      return;
    }
    if (record.timerId !== null) {
      clearTimeout(record.timerId);
      record.timerId = null;
    }
    const elapsed = Math.max(0, Date.now() - record.startedAt);
    record.remainingMs = Math.max(0, record.remainingMs - elapsed);
    record.paused = true;
    record.element.dataset.paused = "true";
  }

  function resumeTimer(record) {
    if (!record.paused || record.exiting || record.payload.duration === Infinity) {
      return;
    }
    if (record.remainingMs <= 0) {
      dismiss(record.id, "timeout");
      return;
    }
    startTimer(record);
  }

  function renderToastContent(element, record) {
    const { payload } = record;
    const { role, ariaLive } = getAriaAttributes(payload.variant);

    element.className = `tc-toast tc-toast--${payload.variant}`;
    element.dataset.toastId = record.id;
    element.dataset.variant = payload.variant;
    element.dataset.theme = payload.theme;
    element.dataset.paused = "false";
    element.setAttribute("role", role);
    element.setAttribute("aria-live", ariaLive);
    element.setAttribute("aria-atomic", "true");

    if (payload.duration !== Infinity) {
      element.style.setProperty("--tc-duration", `${payload.duration}ms`);
    } else {
      element.style.removeProperty("--tc-duration");
    }

    element.replaceChildren();

    const iconWrap = document.createElement("span");
    iconWrap.className = "tc-toast__icon";
    iconWrap.appendChild(
      createIconElement(
        payload.variant,
        payload.variant === "loading" ? "tc-toast__svg tc-spin" : "tc-toast__svg"
      )
    );
    element.appendChild(iconWrap);

    const body = document.createElement("div");
    body.className = "tc-toast__body";

    if (payload.title) {
      const titleEl = document.createElement("p");
      titleEl.className = "tc-toast__title";
      titleEl.textContent = payload.title;
      body.appendChild(titleEl);
    }

    if (payload.message) {
      const msgEl = document.createElement("p");
      msgEl.className = "tc-toast__message";
      msgEl.textContent = payload.message;
      body.appendChild(msgEl);
    }

    if (payload.action) {
      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "tc-toast__action";
      actionBtn.textContent = payload.action.label;
      actionBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        payload.action.onClick({
          id: record.id,
          dismiss: () => dismiss(record.id, "action"),
        });
      });
      body.appendChild(actionBtn);
    }

    element.appendChild(body);

    if (payload.dismissible) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "tc-toast__close";
      closeBtn.setAttribute("aria-label", "Dismiss notification");
      closeBtn.appendChild(createIconElement("close", "tc-toast__close-svg"));
      closeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        dismiss(record.id, "manual");
      });
      element.appendChild(closeBtn);
    }

    if (payload.showProgress && payload.duration !== Infinity) {
      const progressEl = document.createElement("span");
      progressEl.className = "tc-toast__progress";
      progressEl.setAttribute("aria-hidden", "true");
      element.appendChild(progressEl);
    }
  }

  function attachToastInteractions(element, record) {
    element.addEventListener("mouseenter", () => {
      record.hovered = true;
      if (record.payload.pauseOnHover) {
        pauseTimer(record);
      }
    });

    element.addEventListener("mouseleave", () => {
      record.hovered = false;
      if (record.payload.pauseOnHover && !record.focused) {
        resumeTimer(record);
      }
    });

    element.addEventListener("focusin", () => {
      record.focused = true;
      if (record.payload.pauseOnHover) {
        pauseTimer(record);
      }
    });

    element.addEventListener("focusout", (event) => {
      if (!element.contains(event.relatedTarget)) {
        record.focused = false;
        if (record.payload.pauseOnHover && !record.hovered) {
          resumeTimer(record);
        }
      }
    });
  }

  function enforceMaxVisible(position) {
    const activeInPosition = [...toasts.values()].filter(
      (record) => !record.exiting && record.payload.position === position
    );

    const overflow = activeInPosition.length - config.maxVisible;
    for (let i = 0; i < overflow; i += 1) {
      dismiss(activeInPosition[i].id, "evicted");
    }
  }

  function insertToastElement(container, element, position) {
    const isTop = position.startsWith("top-");
    if ((isTop && config.newestOnTop) || (!isTop && !config.newestOnTop)) {
      container.prepend(element);
    } else {
      container.appendChild(element);
    }
  }

  function show(input, options = {}) {
    if (destroyed) {
      return null;
    }

    const payload = normalizeToastInput(input, options, config);
    if (!payload) {
      return null;
    }

    if (payload.id && toasts.has(payload.id)) {
      const existing = toasts.get(payload.id);
      if (existing && !existing.exiting) {
        update(payload.id, payload);
        return payload.id;
      }
      if (existing) {
        removeToastElement(existing);
      }
    }

    const container = getOrCreateContainer(payload.position);
    if (!container) {
      return null;
    }

    const id = payload.id || `toast-${++idCounter}`;
    const element = document.createElement("div");

    const record = {
      id,
      payload,
      element,
      createdAt: Date.now(),
      remainingMs: payload.duration,
      startedAt: 0,
      timerId: null,
      exitTimerId: null,
      hovered: false,
      focused: false,
      paused: false,
      exiting: false,
    };

    renderToastContent(element, record);
    attachToastInteractions(element, record);

    element.dataset.state = "entering";
    toasts.set(id, record);
    insertToastElement(container, element, payload.position);

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        if (!record.exiting && element.isConnected) {
          element.dataset.state = "open";
        }
      });
    } else {
      element.dataset.state = "open";
    }

    recordHistory("shown", record);
    enforceMaxVisible(payload.position);
    startTimer(record);
    syncEscapeListener();
    emitState();

    return id;
  }

  function update(id, input, options = {}) {
    if (destroyed || !id) {
      return false;
    }
    const record = toasts.get(String(id));
    if (!record || record.exiting) {
      return false;
    }

    const mergedBase = {
      ...config,
      position: record.payload.position,
      theme: record.payload.theme,
    };

    const nextPayload = normalizeToastInput(input, options, mergedBase);
    if (!nextPayload) {
      return false;
    }

    if (record.timerId !== null) {
      clearTimeout(record.timerId);
      record.timerId = null;
    }

    const previousPosition = record.payload.position;
    record.payload = nextPayload;
    record.remainingMs = nextPayload.duration;
    record.paused = false;

    if (previousPosition !== nextPayload.position) {
      const nextContainer = getOrCreateContainer(nextPayload.position);
      if (nextContainer) {
        insertToastElement(nextContainer, record.element, nextPayload.position);
        cleanupEmptyContainer(previousPosition);
        enforceMaxVisible(nextPayload.position);
      }
    }

    renderToastContent(record.element, record);
    record.element.dataset.state = "open";
    if (
      record.payload.duration !== Infinity &&
      record.payload.pauseOnHover &&
      (record.hovered || record.focused)
    ) {
      record.paused = true;
      record.element.dataset.paused = "true";
    } else {
      startTimer(record);
    }
    recordHistory("updated", record);
    emitState();
    return true;
  }

  function dismiss(id, reason = "manual") {
    if (!id) {
      return false;
    }
    const record = toasts.get(String(id));
    if (!record || record.exiting) {
      return false;
    }

    record.exiting = true;
    if (record.timerId !== null) {
      clearTimeout(record.timerId);
      record.timerId = null;
    }

    record.element.dataset.state = "closing";
    recordHistory("dismissed", record, reason);

    try {
      record.payload.onDismiss?.({
        id: record.id,
        reason,
        toast: toPublicToast(record),
      });
    } catch (error) {
      console.error("Toast onDismiss callback failed:", error);
    }

    emitState();

    if (config.exitDuration === 0) {
      removeToastElement(record);
    } else {
      record.exitTimerId = setTimeout(() => {
        removeToastElement(record);
      }, config.exitDuration);
    }

    return true;
  }

  function clear(reason = "clear") {
    const activeIds = [...toasts.values()]
      .filter((record) => !record.exiting)
      .map((record) => record.id);

    for (const id of activeIds) {
      dismiss(id, reason);
    }
  }

  function updateConfig(nextConfig = {}) {
    config = normalizeConfig(nextConfig, config);
    emitState();
    return { ...config };
  }

  function getConfig() {
    return { ...config };
  }

  function getToasts() {
    return [...toasts.values()].filter((record) => !record.exiting).map(toPublicToast);
  }

  function getHistory() {
    return history.map((entry) => ({ ...entry }));
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("subscribe(listener) requires a function.");
    }
    listeners.add(listener);
    listener({
      config: { ...config },
      active: getToasts(),
      history: getHistory(),
    });
    return () => {
      listeners.delete(listener);
    };
  }

  function destroy() {
    if (destroyed) {
      return;
    }
    destroyed = true;

    for (const record of toasts.values()) {
      if (record.timerId !== null) {
        clearTimeout(record.timerId);
      }
      if (record.exitTimerId !== null) {
        clearTimeout(record.exitTimerId);
      }
      if (record.element && record.element.isConnected) {
        record.element.remove();
      }
    }
    toasts.clear();

    for (const container of containers.values()) {
      if (container.isConnected) {
        container.remove();
      }
    }
    containers.clear();

    if (escapeListenerAttached && typeof document !== "undefined") {
      document.removeEventListener("keydown", handleDocumentKeydown);
      escapeListenerAttached = false;
    }

    listeners.clear();
  }

  function createVariantHelper(variant) {
    return (input, options = {}) => {
      const merged =
        input && typeof input === "object"
          ? { ...input, ...(options && typeof options === "object" ? options : {}), variant }
          : { ...(options && typeof options === "object" ? options : {}), message: input, variant };
      return show(merged);
    };
  }

  function promise(promiseOrFactory, messages = {}, options = {}) {
    const loadingSpec = resolveAsyncMessage(messages.loading, null, "Working...");
    const toastId = show({
      ...options,
      ...loadingSpec,
      variant: "loading",
      duration: Infinity,
      dismissible: false,
    });

    let targetPromise;
    try {
      targetPromise =
        typeof promiseOrFactory === "function"
          ? Promise.resolve(promiseOrFactory())
          : Promise.resolve(promiseOrFactory);
    } catch (error) {
      targetPromise = Promise.reject(error);
    }

    return targetPromise.then(
      (result) => {
        const successSpec = resolveAsyncMessage(messages.success, result, "Completed");
        if (toastId) {
          update(toastId, {
            ...options,
            ...successSpec,
            variant: "success",
            duration: options.duration ?? config.duration,
            dismissible: options.dismissible ?? config.dismissible,
          });
        }
        return result;
      },
      (error) => {
        const errorSpec = resolveAsyncMessage(messages.error, error, "Something went wrong");
        if (toastId) {
          update(toastId, {
            ...options,
            ...errorSpec,
            variant: "error",
            duration: options.duration ?? config.duration,
            dismissible: options.dismissible ?? config.dismissible,
          });
        }
        throw error;
      }
    );
  }

  function toaster(input, options = {}) {
    return show(input, options);
  }

  toaster.show = show;
  toaster.update = update;
  toaster.dismiss = dismiss;
  toaster.clear = clear;
  toaster.success = createVariantHelper("success");
  toaster.error = createVariantHelper("error");
  toaster.warning = createVariantHelper("warning");
  toaster.info = createVariantHelper("info");
  toaster.loading = createVariantHelper("loading");
  toaster.promise = promise;
  toaster.updateConfig = updateConfig;
  toaster.getConfig = getConfig;
  toaster.getToasts = getToasts;
  toaster.getHistory = getHistory;
  toaster.subscribe = subscribe;
  toaster.destroy = destroy;

  return toaster;
}
