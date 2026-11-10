import "./toaster/toaster.css";

export { createToaster } from "./toaster/createToaster.js";
export { DEFAULT_CONFIG, POSITIONS, THEMES, VARIANTS } from "./toaster/constants.js";
export {
  normalizeConfig,
  normalizeToastInput,
  resolveDuration,
  resolvePosition,
} from "./toaster/config.js";
