/** Session key: set before navigating to `/user/browser`; embedded browser consumes it once. */
export const EMBEDDED_BROWSER_PENDING_URL_KEY = "df-browser-open-url";
export const EMBEDDED_BROWSER_PENDING_TITLE_KEY = "df-browser-open-title";

/** Queue a URL for the next embedded browser mount / `?b=` navigation (Electron shell). */
export function queueEmbeddedBrowserUrl(url: string, title?: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(EMBEDDED_BROWSER_PENDING_URL_KEY, url);
    if (title) sessionStorage.setItem(EMBEDDED_BROWSER_PENDING_TITLE_KEY, title);
    else sessionStorage.removeItem(EMBEDDED_BROWSER_PENDING_TITLE_KEY);
  } catch {
    /* quota / private mode */
  }
}
