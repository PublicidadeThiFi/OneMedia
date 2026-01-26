import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { manualCacheRescueIfRequested, ensureLatestBuild } from "./versionGuard";

// Run cache guards ASAP (safe even without PWA/Service Worker)
manualCacheRescueIfRequested();
ensureLatestBuild();

// Also re-check when the tab becomes visible again (lightweight)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    ensureLatestBuild();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
