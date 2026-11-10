export const POSITIONS = Object.freeze([
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]);

export const THEMES = Object.freeze(["light", "dark", "system"]);

export const VARIANTS = Object.freeze([
  "default",
  "info",
  "success",
  "warning",
  "error",
  "loading",
]);

export const DEFAULT_CONFIG = Object.freeze({
  position: "bottom-right",
  theme: "light",
  duration: 4000,
  maxVisible: 5,
  dismissible: true,
  pauseOnHover: true,
  showProgress: true,
  newestOnTop: true,
  exitDuration: 220,
});
