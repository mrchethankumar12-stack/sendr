// src/index.js
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/global.css"; // adjust/remove if your stylesheet path differs

const container = document.getElementById("root");
if (!container) {
  throw new Error('Root element not found. Ensure public/index.html has <div id="root"></div>');
}

createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
