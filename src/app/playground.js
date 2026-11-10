import { POSITIONS, THEMES } from "../toaster/constants.js";
import { createToaster } from "../toaster/createToaster.js";

const PLAYGROUND_VARIANTS = ["default", "success", "info", "warning", "error"];

const POSITION_LABELS = {
  "top-left": "Top Left",
  "top-center": "Top Center",
  "top-right": "Top Right",
  "bottom-left": "Bottom Left",
  "bottom-center": "Bottom Center",
  "bottom-right": "Bottom Right",
};

function buildCodeSnippet(state) {
  const durationLiteral = state.persistent ? "Infinity" : String(state.durationSeconds * 1000);
  const lines = [
    `import { createToaster } from "my-js-project";`,
    ``,
    `const toaster = createToaster({`,
    `  position: ${JSON.stringify(state.position)},`,
    `  theme: ${JSON.stringify(state.theme)},`,
    `  duration: ${durationLiteral},`,
    `  dismissible: ${state.dismissible},`,
    `  pauseOnHover: ${state.pauseOnHover},`,
    `  showProgress: ${state.showProgress},`,
    `});`,
    ``,
  ];

  const payloadParts = [];
  if (state.title.trim()) {
    payloadParts.push(`  title: ${JSON.stringify(state.title.trim())},`);
  }
  payloadParts.push(`  message: ${JSON.stringify(state.message.trim() || "Download complete")},`);
  if (state.includeAction) {
    payloadParts.push(`  action: { label: "Undo", onClick: ({ dismiss }) => dismiss() },`);
  }

  const callName = state.variant === "default" ? "toaster" : `toaster.${state.variant}`;
  lines.push(`${callName}({`);
  lines.push(...payloadParts);
  lines.push(`});`);

  return lines.join("\n");
}

async function copyText(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

/**
 * Mounts the interactive ToastCraft playground inside `rootElement`.
 * Returns a controller handle with `toaster` and `destroy()` for clean teardown.
 */
export function mountPlayground(rootElement, initialOptions = {}) {
  if (!rootElement) {
    throw new TypeError("mountPlayground requires a valid root DOM element.");
  }

  const state = {
    theme: initialOptions.theme || "light",
    position: initialOptions.position || "bottom-right",
    variant: initialOptions.variant || "success",
    title: "Deployment completed",
    message: "Version 2.4.0 is live across all edge regions.",
    durationSeconds: 4,
    persistent: false,
    dismissible: true,
    pauseOnHover: true,
    showProgress: true,
    includeAction: false,
    promiseAttempt: 0,
  };

  const toaster = createToaster({
    position: state.position,
    theme: state.theme,
    duration: state.durationSeconds * 1000,
    dismissible: state.dismissible,
    pauseOnHover: state.pauseOnHover,
    showProgress: state.showProgress,
  });

  if (typeof document !== "undefined") {
    document.documentElement.dataset.appTheme = state.theme;
  }

  rootElement.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <div class="brand">
          <div class="brand__badge" aria-hidden="true">TC</div>
          <div>
            <h1 class="brand__title">ToastCraft</h1>
            <p class="brand__subtitle">Accessible, zero-dependency JavaScript notification engine</p>
          </div>
        </div>
        <div class="header-controls">
          <div class="pill-group" role="group" aria-label="Theme selector" data-role="theme-group"></div>
        </div>
      </header>

      <main class="app-grid">
        <section class="card" aria-labelledby="builder-heading">
          <div class="card__header">
            <div>
              <h2 class="card__title" id="builder-heading">Interactive Notification Builder</h2>
              <p class="card__hint">Configure behavior, positioning, and accessibility in real time.</p>
            </div>
          </div>

          <form class="form-stack" data-role="builder-form">
            <div class="field-row">
              <div class="field">
                <label class="field__label" for="toast-title">Title (optional)</label>
                <input class="input" id="toast-title" name="title" type="text" maxlength="80" />
              </div>
              <div class="field">
                <label class="field__label" for="toast-message">Message</label>
                <input class="input" id="toast-message" name="message" type="text" maxlength="200" required />
              </div>
            </div>

            <fieldset class="fieldset">
              <legend class="fieldset__legend">Variant</legend>
              <div class="variant-grid" data-role="variant-group"></div>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset__legend">Position</legend>
              <div class="position-grid" data-role="position-group"></div>
            </fieldset>

            <div class="field">
              <label class="field__label" for="toast-duration">Auto-dismiss Duration</label>
              <div class="range-row">
                <input id="toast-duration" name="duration" type="range" min="1" max="10" step="1" />
                <span class="range-value" data-role="duration-label"></span>
              </div>
            </div>

            <div class="toggle-grid">
              <label class="toggle">
                <input type="checkbox" name="persistent" />
                <span>Persistent (no auto-dismiss)</span>
              </label>
              <label class="toggle">
                <input type="checkbox" name="dismissible" />
                <span>Show close button</span>
              </label>
              <label class="toggle">
                <input type="checkbox" name="pauseOnHover" />
                <span>Pause on hover / focus</span>
              </label>
              <label class="toggle">
                <input type="checkbox" name="showProgress" />
                <span>Show countdown progress</span>
              </label>
              <label class="toggle">
                <input type="checkbox" name="includeAction" />
                <span>Include action button</span>
              </label>
            </div>

            <div class="actions-bar">
              <button class="btn btn--primary" type="submit" data-action="trigger">
                Show Notification
              </button>
              <button class="btn" type="button" data-action="promise">
                Simulate Async Promise
              </button>
              <button class="btn" type="button" data-action="burst">
                Fire Burst (4x)
              </button>
              <button class="btn" type="button" data-action="classic">
                Classic Demo
              </button>
              <button class="btn" type="button" data-action="clear">
                Clear All
              </button>
            </div>
          </form>
        </section>

        <div class="right-column">
          <section class="card" aria-labelledby="snippet-heading">
            <div class="card__header">
              <div>
                <h2 class="card__title" id="snippet-heading">Generated Code</h2>
                <p class="card__hint">Drop-in configuration matching your current controls.</p>
              </div>
              <button class="btn btn--sm" type="button" data-action="copy">Copy Code</button>
            </div>
            <pre class="code-block"><code data-role="code-output"></code></pre>
          </section>

          <section class="card" aria-labelledby="telemetry-heading">
            <div class="card__header">
              <div>
                <h2 class="card__title" id="telemetry-heading">Live Telemetry</h2>
                <p class="card__hint">Press Escape to dismiss the newest active notification.</p>
              </div>
            </div>
            <div class="stats-row">
              <div class="stat-box">
                <span class="stat-box__label">Active Toasts</span>
                <span class="stat-box__value" data-role="active-count">0</span>
              </div>
              <div class="stat-box">
                <span class="stat-box__label">Events Logged</span>
                <span class="stat-box__value" data-role="history-count">0</span>
              </div>
            </div>
            <ul class="history-list" data-role="history-list" aria-live="off"></ul>
          </section>
        </div>
      </main>

      <footer class="app-footer">
        <span>Backward compatible with <code>createToaster(config)(message)</code></span>
        <span>ARIA-live regions &bull; Reduced-motion safe &bull; Zero runtime dependencies</span>
      </footer>
    </div>
  `;

  const themeGroup = rootElement.querySelector('[data-role="theme-group"]');
  const variantGroup = rootElement.querySelector('[data-role="variant-group"]');
  const positionGroup = rootElement.querySelector('[data-role="position-group"]');
  const form = rootElement.querySelector('[data-role="builder-form"]');
  const titleInput = rootElement.querySelector("#toast-title");
  const messageInput = rootElement.querySelector("#toast-message");
  const durationInput = rootElement.querySelector("#toast-duration");
  const durationLabel = rootElement.querySelector('[data-role="duration-label"]');
  const codeOutput = rootElement.querySelector('[data-role="code-output"]');
  const activeCountEl = rootElement.querySelector('[data-role="active-count"]');
  const historyCountEl = rootElement.querySelector('[data-role="history-count"]');
  const historyListEl = rootElement.querySelector('[data-role="history-list"]');

  const checkboxes = {
    persistent: form.elements.namedItem("persistent"),
    dismissible: form.elements.namedItem("dismissible"),
    pauseOnHover: form.elements.namedItem("pauseOnHover"),
    showProgress: form.elements.namedItem("showProgress"),
    includeAction: form.elements.namedItem("includeAction"),
  };

  function syncToasterConfig() {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.appTheme = state.theme;
    }
    toaster.updateConfig({
      position: state.position,
      theme: state.theme,
      duration: state.persistent ? Infinity : state.durationSeconds * 1000,
      dismissible: state.dismissible,
      pauseOnHover: state.pauseOnHover,
      showProgress: state.showProgress,
    });
  }

  function renderControls() {
    titleInput.value = state.title;
    messageInput.value = state.message;
    durationInput.value = String(state.durationSeconds);
    durationInput.disabled = state.persistent;
    durationLabel.textContent = state.persistent ? "Persistent" : `${state.durationSeconds}s`;

    for (const [key, input] of Object.entries(checkboxes)) {
      input.checked = Boolean(state[key]);
    }

    themeGroup.replaceChildren();
    for (const theme of THEMES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill-btn";
      btn.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
      btn.setAttribute("aria-pressed", String(state.theme === theme));
      btn.addEventListener("click", () => {
        state.theme = theme;
        syncToasterConfig();
        renderControls();
      });
      themeGroup.appendChild(btn);
    }

    variantGroup.replaceChildren();
    for (const variant of PLAYGROUND_VARIANTS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "variant-btn";
      btn.textContent = variant;
      btn.setAttribute("aria-pressed", String(state.variant === variant));
      btn.addEventListener("click", () => {
        state.variant = variant;
        renderControls();
      });
      variantGroup.appendChild(btn);
    }

    positionGroup.replaceChildren();
    for (const position of POSITIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pos-btn";
      btn.textContent = POSITION_LABELS[position];
      btn.setAttribute("aria-pressed", String(state.position === position));
      btn.addEventListener("click", () => {
        state.position = position;
        syncToasterConfig();
        renderControls();
      });
      positionGroup.appendChild(btn);
    }

    codeOutput.textContent = buildCodeSnippet(state);
  }

  function renderTelemetry(snapshot) {
    activeCountEl.textContent = String(snapshot.active.length);
    historyCountEl.textContent = String(snapshot.history.length);
    historyListEl.replaceChildren();

    if (snapshot.history.length === 0) {
      const empty = document.createElement("li");
      empty.className = "history-empty";
      empty.textContent = "No notifications triggered yet.";
      historyListEl.appendChild(empty);
      return;
    }

    for (const entry of snapshot.history.slice(0, 12)) {
      const item = document.createElement("li");
      item.className = "history-item";

      const textSpan = document.createElement("span");
      textSpan.className = "history-item__text";
      const label = entry.title ? `${entry.title}: ${entry.message}` : entry.message;
      textSpan.textContent = label;

      const metaSpan = document.createElement("span");
      metaSpan.className = "history-item__meta";
      metaSpan.textContent = entry.reason ? `${entry.event} (${entry.reason})` : entry.event;

      item.append(textSpan, metaSpan);
      historyListEl.appendChild(item);
    }
  }

  function triggerConfiguredToast() {
    const cleanMessage = state.message.trim() || "Notification triggered";
    const payload = {
      title: state.title.trim(),
      message: cleanMessage,
      variant: state.variant,
    };

    if (state.includeAction) {
      payload.action = {
        label: "Undo",
        onClick: ({ dismiss }) => {
          dismiss();
          toaster.info("Action undone");
        },
      };
    }

    toaster.show(payload);
  }

  titleInput.addEventListener("input", (event) => {
    state.title = event.target.value;
    codeOutput.textContent = buildCodeSnippet(state);
  });

  messageInput.addEventListener("input", (event) => {
    state.message = event.target.value;
    codeOutput.textContent = buildCodeSnippet(state);
  });

  durationInput.addEventListener("input", (event) => {
    state.durationSeconds = Number(event.target.value);
    syncToasterConfig();
    renderControls();
  });

  for (const [key, input] of Object.entries(checkboxes)) {
    input.addEventListener("change", (event) => {
      state[key] = event.target.checked;
      syncToasterConfig();
      renderControls();
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    triggerConfiguredToast();
  });

  rootElement.querySelector('[data-action="promise"]').addEventListener("click", () => {
    state.promiseAttempt += 1;
    const shouldSucceed = state.promiseAttempt % 2 === 1;

    const simulatedRequest = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldSucceed) {
          resolve({ records: 18 });
        } else {
          reject(new Error("Upstream gateway timeout"));
        }
      }, 950);
    });

    toaster
      .promise(simulatedRequest, {
        loading: "Syncing workspace changes...",
        success: (data) => `Synced ${data.records} settings successfully`,
        error: (err) => err.message,
      })
      .catch(() => {});
  });

  const burstTimers = [];
  rootElement.querySelector('[data-action="burst"]').addEventListener("click", () => {
    const batch = [
      { variant: "info", title: "Queue started", message: "Preparing 3 assets for upload." },
      { variant: "success", title: "Asset compiled", message: "Bundle verified (14.2 kB gzip)." },
      { variant: "warning", title: "Cache near limit", message: "Storage usage reached 85%." },
      { variant: "success", title: "All tasks done", message: "Pipeline completed cleanly." },
    ];
    batch.forEach((item, index) => {
      const id = setTimeout(() => {
        toaster.show(item);
      }, index * 180);
      burstTimers.push(id);
    });
  });

  rootElement.querySelector('[data-action="classic"]').addEventListener("click", () => {
    toaster("Download Done");
    const id = setTimeout(() => {
      toaster.success("Harsh accepted your request");
    }, 600);
    burstTimers.push(id);
  });

  rootElement.querySelector('[data-action="clear"]').addEventListener("click", () => {
    toaster.clear();
  });

  rootElement.querySelector('[data-action="copy"]').addEventListener("click", async () => {
    const snippet = buildCodeSnippet(state);
    try {
      const copied = await copyText(snippet);
      if (copied) {
        toaster.success("Snippet copied to clipboard");
      } else {
        toaster.info("Clipboard unavailable in this environment");
      }
    } catch {
      toaster.error("Unable to copy snippet");
    }
  });

  const unsubscribe = toaster.subscribe(renderTelemetry);
  renderControls();

  return {
    toaster,
    destroy() {
      for (const id of burstTimers) {
        clearTimeout(id);
      }
      burstTimers.length = 0;
      unsubscribe();
      toaster.destroy();
      rootElement.replaceChildren();
    },
  };
}
