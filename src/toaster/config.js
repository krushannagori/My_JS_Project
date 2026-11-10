import { DEFAULT_CONFIG, POSITIONS, THEMES, VARIANTS } from "./constants.js";

/**
 * Resolves a toast position string, supporting both modern `position`
 * values (e.g. "bottom-right") and legacy `positionX` / `positionY` fields.
 */
export function resolvePosition(rawConfig = {}, fallback = DEFAULT_CONFIG.position) {
  if (typeof rawConfig.position === "string" && POSITIONS.includes(rawConfig.position)) {
    return rawConfig.position;
  }

  const hasLegacyCoords = rawConfig.positionY !== undefined || rawConfig.positionX !== undefined;

  if (hasLegacyCoords) {
    const y = rawConfig.positionY === "top" ? "top" : "bottom";
    let x = "right";
    if (rawConfig.positionX === "left") {
      x = "left";
    } else if (rawConfig.positionX === "center") {
      x = "center";
    }
    return `${y}-${x}`;
  }

  return fallback;
}

/**
 * Resolves a toast duration into milliseconds (`Infinity` for persistent toasts).
 * Preserves backward compatibility with legacy `{ positionX, positionY, duration: 3 }`
 * configs where small numbers (<= 60) represented seconds.
 */
export function resolveDuration(rawConfig = {}, fallback = DEFAULT_CONFIG.duration) {
  if (rawConfig.durationMs !== undefined) {
    if (rawConfig.durationMs === null || rawConfig.durationMs === Infinity) {
      return Infinity;
    }
    const ms = Number(rawConfig.durationMs);
    if (Number.isFinite(ms)) {
      return ms <= 0 ? Infinity : ms;
    }
  }

  if (rawConfig.duration === undefined) {
    return fallback;
  }

  if (rawConfig.duration === null || rawConfig.duration === Infinity) {
    return Infinity;
  }

  const numericDuration = Number(rawConfig.duration);
  if (!Number.isFinite(numericDuration)) {
    return fallback;
  }

  if (numericDuration <= 0) {
    return Infinity;
  }

  const usesLegacySeconds =
    (rawConfig.positionX !== undefined || rawConfig.positionY !== undefined) &&
    numericDuration <= 60;

  return usesLegacySeconds ? numericDuration * 1000 : numericDuration;
}

function clampPositiveInt(value, fallback, min = 1, max = 50) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(num)));
}

/**
 * Normalizes and validates a toaster configuration object against defaults.
 */
export function normalizeConfig(rawConfig = {}, baseConfig = DEFAULT_CONFIG) {
  const safeInput = rawConfig && typeof rawConfig === "object" ? rawConfig : {};

  const theme = THEMES.includes(safeInput.theme) ? safeInput.theme : baseConfig.theme;
  const position = resolvePosition(safeInput, baseConfig.position);
  const duration = resolveDuration(safeInput, baseConfig.duration);
  const maxVisible = clampPositiveInt(safeInput.maxVisible, baseConfig.maxVisible, 1, 20);
  const exitDuration = clampPositiveInt(safeInput.exitDuration, baseConfig.exitDuration, 0, 2000);

  return {
    position,
    theme,
    duration,
    maxVisible,
    exitDuration,
    dismissible:
      typeof safeInput.dismissible === "boolean" ? safeInput.dismissible : baseConfig.dismissible,
    pauseOnHover:
      typeof safeInput.pauseOnHover === "boolean"
        ? safeInput.pauseOnHover
        : baseConfig.pauseOnHover,
    showProgress:
      typeof safeInput.showProgress === "boolean"
        ? safeInput.showProgress
        : baseConfig.showProgress,
    newestOnTop:
      typeof safeInput.newestOnTop === "boolean" ? safeInput.newestOnTop : baseConfig.newestOnTop,
  };
}

/**
 * Normalizes either `(message, options)` or `(options)` into a structured toast payload.
 * Returns `null` when no visible title or message text is provided.
 */
export function normalizeToastInput(input, options = {}, baseConfig = DEFAULT_CONFIG) {
  const rawOptions =
    input && typeof input === "object"
      ? { ...input, ...(options && typeof options === "object" ? options : {}) }
      : { ...(options && typeof options === "object" ? options : {}), message: input };

  const message =
    rawOptions.message !== undefined && rawOptions.message !== null
      ? String(rawOptions.message).trim()
      : "";
  const title =
    rawOptions.title !== undefined && rawOptions.title !== null
      ? String(rawOptions.title).trim()
      : "";

  if (!message && !title) {
    return null;
  }

  const variant = VARIANTS.includes(rawOptions.variant) ? rawOptions.variant : "default";
  const theme = THEMES.includes(rawOptions.theme) ? rawOptions.theme : baseConfig.theme;
  const position = resolvePosition(rawOptions, baseConfig.position);

  const defaultDuration = variant === "loading" ? Infinity : baseConfig.duration;
  const duration = resolveDuration(rawOptions, defaultDuration);

  const action =
    rawOptions.action &&
    typeof rawOptions.action === "object" &&
    typeof rawOptions.action.label === "string" &&
    rawOptions.action.label.trim() &&
    typeof rawOptions.action.onClick === "function"
      ? {
          label: rawOptions.action.label.trim(),
          onClick: rawOptions.action.onClick,
        }
      : null;

  return {
    id: rawOptions.id ? String(rawOptions.id) : null,
    title,
    message,
    variant,
    theme,
    position,
    duration,
    dismissible:
      typeof rawOptions.dismissible === "boolean"
        ? rawOptions.dismissible
        : variant === "loading"
          ? false
          : baseConfig.dismissible,
    pauseOnHover:
      typeof rawOptions.pauseOnHover === "boolean"
        ? rawOptions.pauseOnHover
        : baseConfig.pauseOnHover,
    showProgress:
      typeof rawOptions.showProgress === "boolean"
        ? rawOptions.showProgress
        : baseConfig.showProgress,
    action,
    onDismiss: typeof rawOptions.onDismiss === "function" ? rawOptions.onDismiss : null,
  };
}
