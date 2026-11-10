const SVG_NS = "http://www.w3.org/2000/svg";

const ICON_PATHS = {
  success: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } },
    { tag: "path", attrs: { d: "m9 12 2 2 4-4" } },
  ],
  error: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } },
    { tag: "path", attrs: { d: "m15 9-6 6" } },
    { tag: "path", attrs: { d: "m9 9 6 6" } },
  ],
  warning: [
    {
      tag: "path",
      attrs: {
        d: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
      },
    },
    { tag: "path", attrs: { d: "M12 9v4" } },
    { tag: "path", attrs: { d: "M12 17h.01" } },
  ],
  info: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } },
    { tag: "path", attrs: { d: "M12 16v-4" } },
    { tag: "path", attrs: { d: "M12 8h.01" } },
  ],
  default: [
    {
      tag: "path",
      attrs: {
        d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9",
      },
    },
    { tag: "path", attrs: { d: "M13.73 21a2 2 0 0 1-3.46 0" } },
  ],
  loading: [
    {
      tag: "path",
      attrs: { d: "M21 12a9 9 0 1 1-6.219-8.56" },
    },
  ],
  close: [
    { tag: "path", attrs: { d: "M18 6 6 18" } },
    { tag: "path", attrs: { d: "m6 6 12 12" } },
  ],
};

/**
 * Builds an inline SVG icon using DOM APIs without `innerHTML`.
 */
export function createIconElement(name, className = "") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  if (className) {
    svg.setAttribute("class", className);
  }

  const shapes = ICON_PATHS[name] || ICON_PATHS.default;
  for (const shape of shapes) {
    const node = document.createElementNS(SVG_NS, shape.tag);
    for (const [key, value] of Object.entries(shape.attrs)) {
      node.setAttribute(key, value);
    }
    svg.appendChild(node);
  }

  return svg;
}
