import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

function recoverBlankPrimeOsScreen(root: HTMLElement) {
  window.setTimeout(() => {
    const visibleText = root.innerText.trim();
    const alreadyRecovered = window.sessionStorage.getItem("primeos.blank-screen-recovered") === "1";

    if (visibleText.length > 20) {
      window.sessionStorage.removeItem("primeos.blank-screen-recovered");
      return;
    }

    if (!alreadyRecovered) {
      window.sessionStorage.setItem("primeos.blank-screen-recovered", "1");
      for (const key of [
        "prime.workspace.tabs.v1",
        "prime.assistant.floating-open",
        "prime.ai.audit-events",
      ]) {
        window.localStorage.removeItem(key);
      }
      window.location.replace(`${window.location.pathname}${window.location.search ? `${window.location.search}&` : "?"}primeosSafe=1`);
      return;
    }

    root.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;background:#fff;color:#111827;font-family:Inter,system-ui,sans-serif;padding:32px">
        <section style="max-width:560px;border:1px solid #e5e7eb;border-radius:24px;padding:28px;box-shadow:0 18px 60px rgba(15,23,42,.08)">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#4f46e5">PrimeOS recovery</p>
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15">Workspace could not paint in this browser tab.</h1>
          <p style="margin:0 0 20px;color:#6b7280;line-height:1.6">The app cleared stale local workspace state once. Open a fresh tab or reload after disabling extensions for localhost.</p>
          <button onclick="window.sessionStorage.removeItem('primeos.blank-screen-recovered');window.location.href='/overview?primeosSafe=manual'" style="border:0;border-radius:14px;background:#4f46e5;color:white;padding:12px 16px;font-weight:700;cursor:pointer">Reload PrimeOS</button>
        </section>
      </main>
    `;
  }, 2500);
}

if (!rootElement) {
  throw new Error("PrimeOS root element is missing");
}

recoverBlankPrimeOsScreen(rootElement);

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
