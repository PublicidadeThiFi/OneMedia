type VersionPayload = { version?: string };

const VERSION_KEY = "app_version";
const RESCUE_KEY = "cache_rescue_for_version";

function normalizeAppRootPath(url: URL) {
  // GitHub Pages / Fastly costumam canonizar "/app" -> "/app/" (301).
  // Para evitar edge-cases de cache durante atualizações, garantimos que a
  // URL seja sempre a forma canônica quando estivermos exatamente na raiz do app.
  if (url.pathname === "/app") {
    url.pathname = "/app/";
  }
}

/**
 * GitHub Pages / CDN caches HTML aggressively (e.g. max-age=600).
 * When a new deploy happens, a plain `location.reload()` may re-serve cached HTML
 * that still references old hashed bundles, causing a blank screen.
 *
 * Workaround: keep the current build version in the URL querystring and, when a
 * version change is detected, do a `location.replace()` to the same path with the
 * updated version param. This forces the browser/CDN to fetch the fresh HTML.
 */
function ensureUrlHasVersion(version: string) {
  try {
    const url = new URL(window.location.href);
    normalizeAppRootPath(url);
    const current = url.searchParams.get("v");
    if (current === version) return;

    url.searchParams.set("v", version);
    window.history.replaceState(null, "", url.toString());
  } catch {
    // ignore
  }
}

function hardReloadWithVersion(version: string) {
  try {
    const url = new URL(window.location.href);
    normalizeAppRootPath(url);
    url.searchParams.set("v", version);
    window.location.replace(url.toString());
  } catch {
    // Fallback
    window.location.reload();
  }
}

/**
 * Unregister Service Workers + clear CacheStorage.
 * Safe even when the app isn't a PWA.
 */
async function clearSWAndCaches(): Promise<void> {
  // Unregister SWs
  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      // ignore
    }
  }

  // Clear Cache Storage (Workbox/PWA caches)
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      // ignore
    }
  }
}

/**
 * Manual escape hatch: add ?clearcache=1 to the URL.
 * Useful for support when a specific user is stuck.
 */
export async function manualCacheRescueIfRequested(): Promise<void> {
  try {
    const url = new URL(window.location.href);
    const shouldClear = url.searchParams.get("clearcache");
    if (shouldClear !== "1") return;

    // remove the param to avoid loops
    url.searchParams.delete("clearcache");
    window.history.replaceState({}, "", url.toString());

    await clearSWAndCaches();
    window.location.reload();
  } catch {
    // ignore
  }
}

/**
 * Fetches /version.json (no-store) and reloads the page if a new build is detected.
 * This prevents users from getting stuck on old bundles due to cached index.html or SW.
 */
export async function ensureLatestBuild(): Promise<void> {
  try {
    const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;

    const data = (await res.json()) as VersionPayload;
    const version = data?.version;
    if (!version) return;

    // Make reloads cache-safe (CDN may cache HTML for minutes).
    ensureUrlHasVersion(version);

    const local = localStorage.getItem(VERSION_KEY);

    // First visit: store and move on
    if (!local) {
      localStorage.setItem(VERSION_KEY, version);
      return;
    }

    if (local !== version) {
      // Only do the heavy cleanup once per detected version to avoid loops
      const rescuedFor = localStorage.getItem(RESCUE_KEY);
      if (rescuedFor !== version) {
        await clearSWAndCaches();
        localStorage.setItem(RESCUE_KEY, version);
      }

      localStorage.setItem(VERSION_KEY, version);

      // Use a versioned URL to avoid reusing cached HTML from the CDN.
      hardReloadWithVersion(version);
    }
  } catch {
    // ignore (offline, etc.)
  }
}
