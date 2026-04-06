interface ExtensionInfo {
  id: string;
  name: string;
  version?: string;
  path?: string;
}

type ClearLevel = "cache" | "storage" | "all";

function hasTauri(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (window as any).__TAURI__ !== "undefined";
}

export function isDesktop(): boolean {
  return hasTauri();
}

export function getPlatform(): string | null {
  if (!hasTauri()) return null;
  const nav = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Windows/i.test(nav)) return "win32";
  if (/Mac/i.test(nav)) return "darwin";
  if (/Linux/i.test(nav)) return "linux";
  return "unknown";
}

export function getExtensionsAPI() {
  if (!hasTauri()) return null;
  return {
    async list(): Promise<ExtensionInfo[]> {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const list = await invoke<ExtensionInfo[]>("extensions_list");
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    async loadFolder(): Promise<{ success: boolean; name?: string; id?: string; error?: string }> {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const dir = await open({ directory: true, multiple: false });
        if (!dir || Array.isArray(dir)) return { success: false };
        const { invoke } = await import("@tauri-apps/api/core");
        const res = await invoke<{ success: boolean; name?: string; id?: string; error?: string }>(
          "extensions_add_from_folder",
          { path: dir }
        );
        return res;
      } catch (e: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { success: false, error: String((e as any)?.message || e) };
      }
    },
    async remove(id: string): Promise<{ success: boolean; error?: string }> {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const res = await invoke<{ success: boolean; error?: string }>("extensions_remove", { id });
        return res;
      } catch (e: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { success: false, error: String((e as any)?.message || e) };
      }
    },
    async openFolder(): Promise<void> {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("extensions_open_folder");
      } catch {}
    },
  };
}

export function getDesktopBrowserAPI() {
  if (!hasTauri()) return null;
  return {
    async clearCache(): Promise<{ success: boolean; error?: string }> {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        await getCurrentWebview().clearAllBrowsingData();
        return { success: true };
      } catch (e: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { success: false, error: String((e as any)?.message || e) };
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async clearBrowsingData(level: ClearLevel = "cache"): Promise<{ success: boolean; error?: string }> {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        await getCurrentWebview().clearAllBrowsingData();
        return { success: true };
      } catch (e: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { success: false, error: String((e as any)?.message || e) };
      }
    },
  };
}

export async function openExternal(url: string): Promise<void> {
  if (!hasTauri()) {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {}
    return;
  }
  try {
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(url);
  } catch {}
}

export const auth = {
  async googleLink(): Promise<{ success: boolean; error?: string }> {
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL as string) || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/v1/electron-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const { code } = await res.json();
      if (!code) return { success: false, error: "Failed to create link code" };

      await openExternal(`${baseUrl}/auth/link?code=${code}`);

      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const poll = await fetch(`${baseUrl}/api/v1/electron-link?code=${code}`);
          const data = await poll.json();
          if (data.status === "ready" && data.token) {
            try {
              document.cookie = `authjs.session-token=${data.token}; Path=/; SameSite=Lax`;
              window.location.replace(`${baseUrl}/`);
            } catch {}
            return { success: true };
          }
        } catch {}
      }
      return { success: false, error: "Timed out waiting for authentication" };
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { success: false, error: String((e as any)?.message || e) };
    }
  },
};
