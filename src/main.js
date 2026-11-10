import "./styles/app.css";
import "./toaster/toaster.css";
import { mountPlayground } from "./app/playground.js";

const root = document.querySelector("#app");
if (root) {
  mountPlayground(root);
}
