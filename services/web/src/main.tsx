import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("#root element missing");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
