import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { AppErrorBoundary } from "./core/ui.jsx";
import { Platform } from "./platform/Platform.jsx";

const el = document.getElementById("root");
if (el) {
  try {
    createRoot(el).render(<AppErrorBoundary><Platform /></AppErrorBoundary>);
  } catch (err) {
    console.error(err);
    el.innerHTML = '<div style="padding:28px;font-family:system-ui,sans-serif;direction:rtl;background:#F1F3F5;min-height:100vh;color:#F87171"><strong>OS Hub</strong><pre style="margin-top:14px;white-space:pre-wrap">' + String(err && err.stack || err) + "</pre></div>";
  }
}
