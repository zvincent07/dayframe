"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { isDesktop, getExtensionsAPI, getDesktopBrowserAPI } from "@/lib/desktop";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Globe,
  X,
  ExternalLink,
  Lock,
  Maximize2,
  Minimize2,
  Plus,
  Puzzle,
  FolderOpen,
  Trash2,
  Layers,
  ChevronRight,
  ChevronDown,
  Pencil,
  Check,
  History,
  Home,
  Copy,
  MoreVertical,
  Search as SearchIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { getBrowserTabs, saveBrowserTabs } from "@/actions/browser-tabs";
import type { BrowserTabStateResponse } from "@/actions/browser-tabs";
import { EMBEDDED_BROWSER_PENDING_URL_KEY, EMBEDDED_BROWSER_PENDING_TITLE_KEY } from "@/lib/browser-open";
import { GROUP_COLORS, type GroupColor } from "@/schemas/browser-tabs";
import { logger } from "@/lib/logger";

interface Tab {
  id: string;
  title: string;
  url: string;
  initialUrl: string;
  isLoading: boolean;
  isSecure: boolean;
  groupId: string | null;
  position: number;
  needsAutoNavigate?: boolean;
}

interface TabGroup {
  groupId: string;
  name: string;
  color: GroupColor;
  collapsed: boolean;
  position: number;
}

const DEFAULT_URL = "https://www.google.com/";
const GOOGLE_SEARCH_URL = "https://www.google.com/search?q=";
const TAURI_MAIN_WINDOW_LABEL = "main";
const VISIT_HISTORY_KEY = "df_embedded_browser_visit_history_v1";
const MAX_VISIT_HISTORY = 150;

interface VisitRecord {
  url: string;
  title: string;
  at: number;
}

async function loadVisitHistory(): Promise<VisitRecord[]> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VISIT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VisitRecord[];
  } catch {
    return [];
  }
}

async function saveVisitHistory(history: VisitRecord[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify(history);
    localStorage.setItem(VISIT_HISTORY_KEY, payload);
  } catch {}
}

const COLOR_MAP: Record<GroupColor, { bg: string; border: string; text: string; dot: string }> = {
  red:    { bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-400",    dot: "bg-red-500" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", dot: "bg-orange-500" },
  yellow: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", dot: "bg-yellow-500" },
  green:  { bg: "bg-emerald-500/10",border: "border-emerald-500/30",text: "text-emerald-400",dot: "bg-emerald-500" },
  cyan:   { bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   text: "text-cyan-400",   dot: "bg-cyan-500" },
  blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-400",   dot: "bg-blue-500" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", dot: "bg-purple-500" },
  pink:   { bg: "bg-pink-500/10",   border: "border-pink-500/30",   text: "text-pink-400",   dot: "bg-pink-500" },
};

function tauriWebviewLabelForTabId(tabId: string): string {
  return `df-browser-${tabId.replace(/[^a-zA-Z0-9\-_:]/g, "-")}`;
}

// Container physically shrinks via CSS flexbox when sidebar is open!
// We only need to subtract height for the Find bar at the bottom.
function getEmbeddedBrowserViewportBounds(
  container: HTMLElement, 
  isFindOpen: boolean
): {
  viewportX: number;
  viewportY: number;
  width: number;
  height: number;
} {
  const rect = container.getBoundingClientRect();
  return {
    viewportX: Math.floor(rect.left),
    viewportY: Math.floor(rect.top),
    width: Math.max(10, Math.floor(rect.width)), 
    height: Math.max(10, Math.floor(rect.height) - (isFindOpen ? 48 : 0)), 
  };
}

interface FindWindow extends Window {
  find?: (
    aString: string,
    aCaseSensitive?: boolean,
    aBackwards?: boolean,
    aWrapAround?: boolean,
    aWholeWord?: boolean,
    aSearchInFrames?: boolean,
    aShowDialog?: boolean
  ) => boolean;
}

function iframeWindowFind(win: Window, text: string, forward: boolean): boolean {
  try {
    const w = win as FindWindow;
    if (typeof w.find === "function") {
      return Boolean(w.find(text, false, forward, true, false, false, false));
    }
  } catch {
    /* cross-origin */
  }
  return false;
}

function ensureProtocol(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes(".") && !trimmed.includes(" ")) return `https://${trimmed}`;
  return `${GOOGLE_SEARCH_URL}${encodeURIComponent(trimmed)}`;
}

function migrateLegacyBrowserUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "search.brave.com") {
      const q = u.searchParams.get("q");
      if (q) return `${GOOGLE_SEARCH_URL}${encodeURIComponent(q)}`;
      return DEFAULT_URL;
    }
    if (u.hostname === "duckduckgo.com" || u.hostname === "www.duckduckgo.com") {
      const q = u.searchParams.get("q");
      if (q) return `${GOOGLE_SEARCH_URL}${encodeURIComponent(q)}`;
      return DEFAULT_URL;
    }
    if (u.hostname === "www.bing.com" || u.hostname === "bing.com") {
      const q = u.searchParams.get("q");
      if (q) return `${GOOGLE_SEARCH_URL}${encodeURIComponent(q)}`;
      return DEFAULT_URL;
    }
    return url;
  } catch {
    return url;
  }
}

function isValidRemoteNavigationUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function consumePendingBrowserOpenUrl(): { url: string; title?: string } | null {
  try {
    const raw = sessionStorage.getItem(EMBEDDED_BROWSER_PENDING_URL_KEY);
    const title = sessionStorage.getItem(EMBEDDED_BROWSER_PENDING_TITLE_KEY) || undefined;
    if (raw) sessionStorage.removeItem(EMBEDDED_BROWSER_PENDING_URL_KEY);
    if (title) sessionStorage.removeItem(EMBEDDED_BROWSER_PENDING_TITLE_KEY);
    if (!raw?.trim()) return null;
    const resolved = migrateLegacyBrowserUrl(ensureProtocol(raw.trim()));
    return isValidRemoteNavigationUrl(resolved) ? { url: resolved, title } : null;
  } catch {
    return null;
  }
}

function stripBookmarkBumpSearchParam() {
  if (typeof window === "undefined") return;
  try {
    const u = new URL(window.location.href);
    if (!u.searchParams.has("b")) return;
    u.searchParams.delete("b");
    const q = u.searchParams.toString();
    window.history.replaceState(null, "", q ? `${u.pathname}?${q}` : u.pathname);
  } catch {
    /* ignore */
  }
}

function getDomainTitleFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || "New Tab";
  } catch {
    return "New Tab";
  }
}

let tabCounter = 0;
function newTabId() {
  return `tab-${++tabCounter}`;
}

let groupCounter = 0;
function newGroupId() {
  return `grp-${++groupCounter}`;
}

function createTab(url = DEFAULT_URL, groupId: string | null = null, position = 0, initialTitle?: string, needsAutoNavigate = false): Tab {
  return {
    id: newTabId(),
    title: initialTitle && initialTitle !== "New Tab" ? initialTitle : getDomainTitleFromUrl(url),
    url,
    initialUrl: url,
    isLoading: false,
    isSecure: url.startsWith("https://"),
    groupId,
    position,
    needsAutoNavigate,
  };
}

function hydrateFromServer(data: BrowserTabStateResponse): { tabs: Tab[]; groups: TabGroup[]; activeTabId: string } {
  if (!data.tabs.length) {
    const tab = createTab();
    return { tabs: [tab], groups: [], activeTabId: tab.id };
  }

  const tabs: Tab[] = data.tabs.map((t) => {
    const url = migrateLegacyBrowserUrl(t.url);
    return {
      id: t.tabId,
      title: t.title,
      url,
      initialUrl: url,
      isLoading: false,
      isSecure: url.startsWith("https://"),
      groupId: t.groupId,
      position: t.position,
    };
  });

  tabCounter = Math.max(tabCounter, ...tabs.map((t) => parseInt(t.id.replace("tab-", ""), 10) || 0));

  const groups: TabGroup[] = data.groups.map((g) => ({
    groupId: g.groupId,
    name: g.name,
    color: (GROUP_COLORS as readonly string[]).includes(g.color) ? g.color as GroupColor : "blue",
    collapsed: g.collapsed,
    position: g.position,
  }));

  groupCounter = Math.max(groupCounter, ...groups.map((g) => parseInt(g.groupId.replace("grp-", ""), 10) || 0));

  const activeId = data.activeTabId && tabs.some((t) => t.id === data.activeTabId)
    ? data.activeTabId
    : tabs[0].id;

  return { tabs, groups, activeTabId: activeId };
}

interface EmbeddedBrowserProps {
  fullPage?: boolean;
}

type SidebarView = "history" | "extensions" | "menu" | "groups" | "tab-actions" | "group-edit" | "all-tabs" | null;

export function EmbeddedBrowser({ fullPage = false }: EmbeddedBrowserProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id || "guest";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bookmarkOpenBump = searchParams.get("b");
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const tabsRef = useRef<Tab[]>([]);
  tabsRef.current = tabs;
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [urlInput, setUrlInput] = useState(DEFAULT_URL);
  const [expanded, setExpanded] = useState(false);
  const [extensions, setExtensions] = useState<{ id: string; name: string; version?: string }[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visitHistory, setVisitHistory] = useState<VisitRecord[]>([]);
  
  // Sidebar State Management
  const [sidebarView, setSidebarView] = useState<SidebarView>(null);
  const [contextTabId, setContextTabId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState("");
  const [findMeta, setFindMeta] = useState<{ current: number; total: number } | null>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const embeddedWebviewTabIdsRef = useRef<Set<string>>(new Set());
  const lastUrlByTabRef = useRef<Map<string, string>>(new Map());
  const activeTabIdRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const urlBarFocusedRef = useRef(false);
  const useDesktopIframeShell = !isDesktop();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [showClearStorageDialog, setShowClearStorageDialog] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setMounted(true);
    void loadVisitHistory().then(setVisitHistory);

    const finishHydration = (nextTabs: Tab[], nextGroups: TabGroup[], nextActiveId: string) => {
      if (ac.signal.aborted) return;
      const pendingData = consumePendingBrowserOpenUrl();
      let tabsOut = nextTabs;
      let activeOut = nextActiveId;
      if (pendingData) {
        const needsAuto = pendingData.url.includes("youtube.") || pendingData.url.includes("google.");
        const t = createTab(pendingData.url, null, 0, pendingData.title, needsAuto);
        tabsOut = [...nextTabs, t];
        activeOut = t.id;
      }
      setTabs(tabsOut);
      setGroups(nextGroups);
      setActiveTabId(activeOut);
      const active = tabsOut.find((x) => x.id === activeOut);
      if (active) setUrlInput(active.url);
      setLoaded(true);
      stripBookmarkBumpSearchParam();
    };

    getBrowserTabs()
      .then((data) => {
        if (ac.signal.aborted) return;
        const hydrated = hydrateFromServer(data);
        finishHydration(hydrated.tabs, hydrated.groups, hydrated.activeTabId);
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        const fallback = createTab();
        finishHydration([fallback], [], fallback.id);
      });

    return () => ac.abort();
  }, []);

  const refreshExtensions = useCallback(async () => {
    const api = getExtensionsAPI();
    if (!api) return;
    try {
      const list = await api.list();
      setExtensions(list);
    } catch {}
  }, []);

  useEffect(() => {
    if (mounted && isDesktop()) refreshExtensions();
  }, [mounted, refreshExtensions]);

  const debouncedSave = useCallback((currentTabs: Tab[], currentGroups: TabGroup[], currentActiveId: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      try {
        await saveBrowserTabs({
          tabs: currentTabs.map((t, i) => ({
            tabId: t.id,
            title: t.title,
            url: t.url,
            groupId: t.groupId,
            position: i,
          })),
          groups: currentGroups.map((g, i) => ({
            groupId: g.groupId,
            name: g.name,
            color: g.color,
            collapsed: g.collapsed,
            position: i,
          })),
          activeTabId: currentActiveId,
        });
      } catch {}
      isSavingRef.current = false;
    }, 2000);
  }, []);

  useEffect(() => {
    if (loaded) debouncedSave(tabs, groups, activeTabId);
  }, [tabs, groups, activeTabId, loaded, debouncedSave]);

  useEffect(() => {
    if (!loaded || pathname !== "/user/browser") return;
    if (bookmarkOpenBump == null || bookmarkOpenBump === "") return;
    const pendingData = consumePendingBrowserOpenUrl();
    if (pendingData) {
      const needsAuto = pendingData.url.includes("youtube.") || pendingData.url.includes("google.");
      const tab = createTab(pendingData.url, null, 0, pendingData.title, needsAuto);
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
      setUrlInput(pendingData.url);
    }
    stripBookmarkBumpSearchParam();
  }, [loaded, pathname, bookmarkOpenBump]);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const urlInputRef = useRef<HTMLInputElement>(null);

  activeTabIdRef.current = activeTabId;

  const updateTab = useCallback((id: string, patch: Partial<Tab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);
  const updateTabRef = useRef(updateTab);
  updateTabRef.current = updateTab;

  useEffect(() => {
    if (!isDesktop()) return;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      try {
        unlisten = await listen<{ label: string; url: string }>("embedded-browser-navigated", (event) => {
          const { label, url: href } = event.payload;
          const tab = tabsRef.current.find((t) => tauriWebviewLabelForTabId(t.id) === label);
          if (!tab) return;
          let normalized: string;
          try {
            normalized = migrateLegacyBrowserUrl(href);
          } catch {
            return;
          }
          if (!isValidRemoteNavigationUrl(normalized) || tab.url === normalized) return;
          lastUrlByTabRef.current.set(tab.id, normalized);
          const newTitle = getDomainTitleFromUrl(normalized);
          updateTabRef.current(tab.id, { url: normalized, isSecure: normalized.startsWith("https:"), title: newTitle });
          if (activeTabIdRef.current === tab.id && !urlBarFocusedRef.current) {
            setUrlInput(normalized);
          }
        });
      } catch (err) {
        logger.error("Tauri listen permission error. Please check your tauri.conf.json capabilities:", err);
      }
    });
    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!loaded || !isDesktop() || useDesktopIframeShell) return;
    const id = window.setInterval(() => {
      const tabId = activeTabIdRef.current;
      if (!tabId || !embeddedWebviewTabIdsRef.current.has(tabId) || urlBarFocusedRef.current) return;
      const label = tauriWebviewLabelForTabId(tabId);
      void import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke<string>("embedded_browser_current_url", { label })
          .then((href) => {
            const tab = tabsRef.current.find((t) => t.id === tabId);
            if (!tab) return;
            let normalized: string;
            try {
              normalized = migrateLegacyBrowserUrl(href);
            } catch {
              return;
            }
            if (!isValidRemoteNavigationUrl(normalized) || tab.url === normalized) return;
            lastUrlByTabRef.current.set(tab.id, normalized);
            const newTitle = getDomainTitleFromUrl(normalized);
            updateTabRef.current(tab.id, { url: normalized, isSecure: normalized.startsWith("https:"), title: newTitle });
            if (activeTabIdRef.current === tab.id && !urlBarFocusedRef.current) {
              setUrlInput(normalized);
            }
          })
          .catch(() => {});
      });
    }, 2500);
    return () => clearInterval(id);
  }, [loaded, useDesktopIframeShell]);

  const recordVisit = useCallback((url: string, title: string) => {
    if (!url || url === "about:blank" || url.startsWith("chrome-error:")) return;
    const entry: VisitRecord = { url, title: title || url, at: Date.now() };
    setVisitHistory((prev) => {
      if (prev[0]?.url === entry.url) {
        const next = [{ ...entry }, ...prev.slice(1)].slice(0, MAX_VISIT_HISTORY);
        void saveVisitHistory(next);
        return next;
      }
      const filtered = prev.filter((e) => e.url !== entry.url);
      const next = [entry, ...filtered].slice(0, MAX_VISIT_HISTORY);
        void saveVisitHistory(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!activeTab?.url) return;
    if (urlBarFocusedRef.current) return;
    setUrlInput(activeTab.url);
  }, [activeTab?.url]);

  const navigate = useCallback((url: string) => {
    if (!activeTab) return;
    const resolved = migrateLegacyBrowserUrl(ensureProtocol(url));
    setUrlInput(resolved);
    updateTab(activeTab.id, { url: resolved, title: getDomainTitleFromUrl(resolved) });
    recordVisit(resolved, resolved);
    
    // Explicitly navigate Tauri Webview immediately instead of waiting for syncTabs
    if (isDesktop() && !useDesktopIframeShell && embeddedWebviewTabIdsRef.current.has(activeTab.id)) {
      const label = tauriWebviewLabelForTabId(activeTab.id);
      lastUrlByTabRef.current.set(activeTab.id, resolved);
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("webview_navigate", { label, url: resolved }).catch(() => {});
      });
    }
  }, [activeTab, updateTab, recordVisit, useDesktopIframeShell]);

  const addTab = useCallback((groupId: string | null = null) => {
    const tab = createTab(DEFAULT_URL, groupId);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const closeTab = useCallback((id: string) => {
    if (isDesktop() && !useDesktopIframeShell && embeddedWebviewTabIdsRef.current.has(id)) {
      const label = tauriWebviewLabelForTabId(id);
      void import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("embedded_browser_close", { label }).catch(() => {});
      });
      embeddedWebviewTabIdsRef.current.delete(id);
    }
    lastUrlByTabRef.current.delete(id);
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fresh = createTab();
        setActiveTabId(fresh.id);
        return [fresh];
      }
      if (activeTabId === id) {
        const closedIdx = prev.findIndex((t) => t.id === id);
        const newActive = next[Math.min(closedIdx, next.length - 1)];
        setActiveTabId(newActive.id);
      }
      return next;
    });
  }, [activeTabId, useDesktopIframeShell]);

  // Tab Management & Bounds Sync
  useEffect(() => {
    if (!loaded || !isDesktop() || useDesktopIframeShell) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let resizeFrameId: number | null = null;

    const syncTabs = async () => {
      const { invoke } = await import("@tauri-apps/api/core");

      for (const t of tabs) {
        if (t.id === activeTabId) continue;
        if (!embeddedWebviewTabIdsRef.current.has(t.id)) continue;
        const hideLabel = tauriWebviewLabelForTabId(t.id);
        await invoke("embedded_browser_set_visible", { label: hideLabel, visible: false }).catch(() => {});
        if (cancelled) return;
      }

      const active = tabs.find((t) => t.id === activeTabId);
      if (!active) return;

      await new Promise<void>((r) => {
        requestAnimationFrame(() => r());
      });
      if (cancelled) return;

      const { viewportX, viewportY, width: bw, height: bh } =
        getEmbeddedBrowserViewportBounds(container, findOpen);

      const label = tauriWebviewLabelForTabId(active.id);
      const hasWebview = embeddedWebviewTabIdsRef.current.has(active.id);

      if (cancelled) return;

      if (!hasWebview) {
        try {
          await invoke("embedded_browser_create_tab", {
            parentLabel: TAURI_MAIN_WINDOW_LABEL,
            label,
            targetUrl: active.url,
            viewportX,
            viewportY,
            width: bw,
            height: bh,
            userId,
          });
          if (cancelled) return;
        } catch (e) {
          const msg = String(e instanceof Error ? e.message : e);
          if (msg.includes("already exists")) {
            await invoke("embedded_browser_set_bounds", {
              parentLabel: TAURI_MAIN_WINDOW_LABEL,
              label,
              viewportX,
              viewportY,
              width: bw,
              height: bh,
            }).catch(() => {});
            if (cancelled) return;
            await invoke("webview_navigate", { label, url: active.url }).catch(() => {});
            if (cancelled) return;
          } else {
            logger.error("Embedded browser WebviewWindow failed", e);
            try {
              const { open } = await import("@tauri-apps/plugin-shell");
              await open(active.url);
            } catch {
              /* ignore */
            }
            return;
          }
        }
        embeddedWebviewTabIdsRef.current.add(active.id);
        lastUrlByTabRef.current.set(active.id, active.url);
        
        // screens when launched as the initial URL in WebviewBuilder. A follow-up navigate call reliably kicks it into loading.
        if (active.needsAutoNavigate) {
          setTimeout(() => {
            if (cancelled) return;
            if (urlInputRef.current) {
              urlInputRef.current.focus();
              urlInputRef.current.select();
            }
            import("@tauri-apps/api/core").then(({ invoke }) => {
              invoke("webview_navigate", { label, url: active.url }).catch(() => {});
            });
          }, 800);
        }
      } else {
        await invoke("embedded_browser_set_bounds", {
          parentLabel: TAURI_MAIN_WINDOW_LABEL,
          label,
          viewportX,
          viewportY,
          width: bw,
          height: bh,
        }).catch(() => {});
        if (cancelled) return;
        const last = lastUrlByTabRef.current.get(active.id);
        if (last === undefined) {
          lastUrlByTabRef.current.set(active.id, active.url);
        }
      }

      if (cancelled) return;

      const currentBounds = getEmbeddedBrowserViewportBounds(container, findOpen);
      for (const t of tabs) {
        if (!embeddedWebviewTabIdsRef.current.has(t.id)) continue;
        const tabLabel = tauriWebviewLabelForTabId(t.id);
        await invoke("embedded_browser_set_bounds", {
          parentLabel: TAURI_MAIN_WINDOW_LABEL,
          label: tabLabel,
          viewportX: currentBounds.viewportX,
          viewportY: currentBounds.viewportY,
          width: currentBounds.width,
          height: currentBounds.height,
        }).catch(() => {});
        if (cancelled) return;
      }

      if (cancelled) return;
      await invoke("embedded_browser_set_visible", { label, visible: true }).catch(() => {});
    };

    const handleResize = () => {
      if (resizeFrameId !== null) cancelAnimationFrame(resizeFrameId);
      resizeFrameId = requestAnimationFrame(() => {
        if (cancelled) return;
        void (async () => {
          const { invoke } = await import("@tauri-apps/api/core");
          const { viewportX, viewportY, width: bw, height: bh } =
            getEmbeddedBrowserViewportBounds(container, findOpen);

          for (const t of tabs) {
            if (!embeddedWebviewTabIdsRef.current.has(t.id)) continue;
            const tabLabel = tauriWebviewLabelForTabId(t.id);
            // Fire-and-forget bounds update for zero lag
            invoke("embedded_browser_set_bounds", {
              parentLabel: TAURI_MAIN_WINDOW_LABEL,
              label: tabLabel,
              viewportX,
              viewportY,
              width: bw,
              height: bh,
            }).catch(() => {});
          }
        })();
      });
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    void syncTabs();

    return () => {
      cancelled = true;
      if (resizeFrameId !== null) cancelAnimationFrame(resizeFrameId);
      ro.disconnect();
    };
  }, [loaded, activeTabId, tabs, useDesktopIframeShell, findOpen, userId]);

  useEffect(() => {
    return () => {
      if (!isDesktop()) return;
      void import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("embedded_browser_hide_all_embedded").catch(() => {});
      });
    };
  }, []);

  // Sync Fullscreen with OS Window State
  useEffect(() => {
    if (!isDesktop()) return;
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
       const win = getCurrentWindow();
       win.setFullscreen(isFullscreen).catch(() => {});
       unlisten = await win.onResized(async () => {
         const isFs = await win.isFullscreen();
         if (isFs !== isFullscreen) {
           setIsFullscreen(isFs);
         }
       });
    });
    return () => {
      unlisten?.();
    };
  }, [isFullscreen]);

  const handleShortcut = useCallback(
    (e: { key: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; preventDefault: () => void }) => {
      const ctrl = e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key.toLowerCase();

      if (ctrl && key === "w") { e.preventDefault(); if (activeTabId) closeTab(activeTabId); return true; }
      if (ctrl && !shift && key === "t") { e.preventDefault(); addTab(); return true; }
      if (ctrl && key === "tab") {
        e.preventDefault();
        setTabs((prev) => {
          const idx = prev.findIndex((t) => t.id === activeTabId);
          if (idx < 0) return prev;
          const next = shift ? (idx - 1 + prev.length) % prev.length : (idx + 1) % prev.length;
          setActiveTabId(prev[next].id);
          return prev;
        });
        return true;
      }
      if (ctrl && key === "l") { e.preventDefault(); urlInputRef.current?.focus(); urlInputRef.current?.select(); return true; }
      if (ctrl && key === "f") {
        e.preventDefault();
        setFindOpen(true);
        setFindMeta(null);
        return true;
      }
      if ((ctrl && key === "r") || key === "f5") { e.preventDefault(); if (activeTab?.url) navigate(activeTab.url); return true; }
      if (key === "escape") { return true; }
      if (alt && key === "arrowleft") { e.preventDefault(); return true; }
      if (alt && key === "arrowright") { e.preventDefault(); return true; }
      if (ctrl && /^[1-9]$/.test(key)) {
        e.preventDefault();
        setTabs((prev) => {
          const num = parseInt(key, 10);
          const idx = num === 9 ? prev.length - 1 : num - 1;
          if (idx >= 0 && idx < prev.length) setActiveTabId(prev[idx].id);
          return prev;
        });
        return true;
      }
      return false;
    },
    [activeTabId, addTab, closeTab, activeTab?.url, navigate]
  );

  const shortcutRef = useRef(handleShortcut);
  shortcutRef.current = handleShortcut;

  useEffect(() => {
    let unlistenShortcut: (() => void) | undefined;
    const setupTauri = async () => {
      if (!isDesktop()) return;
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlistenShortcut = await listen<{ key: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }>("embedded-browser-shortcut", (event) => {
          shortcutRef.current({
            key: event.payload.key,
            ctrlKey: event.payload.ctrlKey,
            shiftKey: event.payload.shiftKey,
            altKey: event.payload.altKey,
            preventDefault: () => {},
          });
        });
      } catch (e) {
        logger.error("Failed to setup embedded browser shortcut listener", e);
      }
    };
    setupTauri();

    const onKeyDown = (e: KeyboardEvent) => {
      shortcutRef.current({
        key: e.key,
        ctrlKey: e.ctrlKey || e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        preventDefault: () => e.preventDefault(),
      });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlistenShortcut?.();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(urlInput);
  };

  useEffect(() => {
    if (!findOpen) {
      try {
        if (isDesktop() && useDesktopIframeShell) {
          iframeRef.current?.contentWindow?.getSelection()?.removeAllRanges();
        } else if (isDesktop() && embeddedWebviewTabIdsRef.current.has(activeTabId)) {
          const label = tauriWebviewLabelForTabId(activeTabId);
          import("@tauri-apps/api/core").then(({ invoke }) => {
            invoke("stop_find_in_page", { label }).catch(() => {});
          });
        }
      } catch {}
      setFindMeta(null);
      return;
    }
    const id = requestAnimationFrame(() => findInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [findOpen, activeTabId, useDesktopIframeShell]);

  useEffect(() => {
    if (!findOpen || !findText.trim()) {
      setFindMeta(null);
      try {
        if (isDesktop() && useDesktopIframeShell) {
          iframeRef.current?.contentWindow?.getSelection()?.removeAllRanges();
        } else if (isDesktop() && embeddedWebviewTabIdsRef.current.has(activeTabId)) {
          const label = tauriWebviewLabelForTabId(activeTabId);
          import("@tauri-apps/api/core").then(({ invoke }) => {
            invoke("stop_find_in_page", { label }).catch((err) => logger.error("stop_find_in_page error", err));
          });
        }
      } catch {}
      return;
    }
    const t = setTimeout(() => {
      if (!isDesktop() || !findText.trim()) return;
      if (useDesktopIframeShell) {
        const win = iframeRef.current?.contentWindow;
        if (win) iframeWindowFind(win, findText, true);
        return;
      }
      if (!embeddedWebviewTabIdsRef.current.has(activeTabId)) return;
      const label = tauriWebviewLabelForTabId(activeTabId);
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("find_in_page", { label, text: findText, forward: true }).catch(() => {});
      });
    }, 120);
    return () => clearTimeout(t);
  }, [findText, findOpen, activeTabId, useDesktopIframeShell]);

  const runFindStep = useCallback(
    (forward: boolean) => {
      if (!findText.trim() || !isDesktop()) return;
      if (useDesktopIframeShell) {
        const win = iframeRef.current?.contentWindow;
        if (win) iframeWindowFind(win, findText, forward);
        return;
      }
      if (!embeddedWebviewTabIdsRef.current.has(activeTabId)) return;
      const label = tauriWebviewLabelForTabId(activeTabId);
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("find_in_page", { label, text: findText, forward }).catch(() => {});
      });
    },
    [activeTabId, findText, useDesktopIframeShell]
  );

  const copyCurrentUrl = useCallback(async () => {
    const u = activeTab?.url;
    if (!u) return;
    try {
      await navigator.clipboard.writeText(u);
      toast.success("Address copied");
    } catch {
      toast.error("Could not copy");
    }
  }, [activeTab?.url]);

  const clearBrowserCache = useCallback(async () => {
    const api = getDesktopBrowserAPI();
    if (!api) return;
    const res = await api.clearCache();
    if (res.success) {
        toast.success("Embedded browser cache cleared");
        setSidebarView(null);
    } else toast.error(res.error || "Clear cache failed");
  }, []);

  const executeClearBrowserStorage = async () => {
    setShowClearStorageDialog(false);
    const api = getDesktopBrowserAPI();
    if (!api) return;
    const res = await api.clearBrowsingData("storage");
    if (res.success) {
      toast.success("Site data cleared");
      setSidebarView(null);
      try {
        if (isDesktop() && useDesktopIframeShell) {
          iframeRef.current?.contentWindow?.location.reload();
        } else if (isDesktop() && embeddedWebviewTabIdsRef.current.has(activeTabId)) {
          const label = tauriWebviewLabelForTabId(activeTabId);
          import("@tauri-apps/api/core").then(({ invoke }) => {
            invoke("webview_action", { label, action: "reload" }).catch(() => {});
          });
        }
      } catch {}
    } else toast.error(res.error || "Clear failed");
  };

  const clearBrowserStorage = useCallback(() => {
    setShowClearStorageDialog(true);
  }, []);

  const executeClearBrowserAll = async () => {
    setShowClearAllDialog(false);
    const api = getDesktopBrowserAPI();
    if (!api) return;
    const res = await api.clearBrowsingData("all");
    if (res.success) {
      toast.success("Browsing data cleared");
      setSidebarView(null);
      try {
        if (isDesktop() && useDesktopIframeShell) {
          iframeRef.current?.contentWindow?.location.reload();
        } else if (isDesktop() && embeddedWebviewTabIdsRef.current.has(activeTabId)) {
          const label = tauriWebviewLabelForTabId(activeTabId);
          import("@tauri-apps/api/core").then(({ invoke }) => {
            invoke("webview_action", { label, action: "reload" }).catch(() => {});
          });
        }
      } catch {}
    } else toast.error(res.error || "Clear failed. Did you update default.json?");
  };

  const clearBrowserAll = useCallback(() => {
    setShowClearAllDialog(true);
  }, []);

  const createGroup = (tabId?: string) => {
    const group: TabGroup = {
      groupId: newGroupId(),
      name: "New Group",
      color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
      collapsed: false,
      position: groups.length,
    };
    setGroups((prev) => [...prev, group]);
    if (tabId) {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, groupId: group.groupId } : t)));
    }
    setEditingGroupId(group.groupId);
    setEditingName(group.name);
    setSidebarView("group-edit");
  };

  const renameGroup = (groupId: string, name: string) => {
    if (!name.trim()) return;
    setGroups((prev) => prev.map((g) => (g.groupId === groupId ? { ...g, name: name.trim() } : g)));
  };

  const changeGroupColor = (groupId: string, color: GroupColor) => {
    setGroups((prev) => prev.map((g) => (g.groupId === groupId ? { ...g, color } : g)));
  };

  const toggleGroupCollapse = (groupId: string) => {
    setGroups((prev) => prev.map((g) => (g.groupId === groupId ? { ...g, collapsed: !g.collapsed } : g)));
  };

  const deleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.groupId !== groupId));
    setTabs((prev) => prev.map((t) => (t.groupId === groupId ? { ...t, groupId: null } : t)));
  };

  const moveTabToGroup = (tabId: string, groupId: string | null) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, groupId } : t)));
    setSidebarView(null);
  };

  const ungroupTab = (tabId: string) => moveTabToGroup(tabId, null);

  const sortedGroups = [...groups].sort((a, b) => a.position - b.position);
  const ungroupedTabs = tabs.filter((t) => !t.groupId);
  const tabsByGroup = (gid: string) => tabs.filter((t) => t.groupId === gid);

  const renderTab = (tab: Tab, groupColor?: GroupColor) => {
    const colors = groupColor ? COLOR_MAP[groupColor] : null;
    return (
      <button
        key={tab.id}
        onClick={() => setActiveTabId(tab.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextTabId(tab.id);
          setSidebarView("tab-actions");
        }}
        className={cn(
          "group relative flex items-center gap-1.5 h-9 min-w-[120px] max-w-[200px] px-3 text-xs border-r border-border transition-colors shrink-0",
          tab.id === activeTabId
            ? cn("bg-card text-foreground", colors && `border-b-2 ${colors.border}`)
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          colors && tab.id !== activeTabId && colors.bg
        )}
      >
        {tab.isLoading ? (
          <RotateCw className="h-3 w-3 animate-spin shrink-0" />
        ) : tab.isSecure ? (
          <Lock className="h-3 w-3 text-emerald-500 shrink-0" />
        ) : (
          <Globe className="h-3 w-3 shrink-0" />
        )}
        <span className="truncate flex-1 text-left">{tab.title}</span>
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
          className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5 shrink-0 transition-opacity"
        >
          <X className="h-3 w-3" />
        </span>
      </button>
    );
  };

  const renderGroupHeader = (group: TabGroup, tabCount: number) => {
    const colors = COLOR_MAP[group.color];
    return (
      <div
        key={`gh-${group.groupId}`}
        className={cn(
          "flex items-center gap-1 h-9 px-2 border-r border-border shrink-0 cursor-pointer select-none",
          colors.bg
        )}
        onClick={() => toggleGroupCollapse(group.groupId)}
        onContextMenu={(e) => {
            e.preventDefault();
            setEditingGroupId(group.groupId);
            setEditingName(group.name);
            setSidebarView("group-edit");
        }}
      >
        <ChevronRight className={cn("h-3 w-3 transition-transform", colors.text, !group.collapsed && "rotate-90")} />
        <span className={cn("h-2 w-2 rounded-full shrink-0", colors.dot)} />
        <span className={cn("text-xs font-medium truncate max-w-[80px]", colors.text)}>
          {group.name}
        </span>
        <span className="text-[10px] text-muted-foreground">{tabCount}</span>
      </div>
    );
  };

  if (!mounted || !loaded) return null;

  return (
    <>
      <div className="md:hidden h-full flex flex-col justify-center p-4">
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Browser</h3>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <Globe className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground max-w-xs">
                The embedded browser is not available on mobile or tablet views. Please resize your window to desktop size or use a desktop device.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {!isDesktop() && (
        <div className="hidden md:flex h-full flex-col justify-center p-4">
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Browser</h3>
              </div>
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <Globe className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground max-w-xs">
                  The embedded browser is available in the Dayframe desktop app.
                  Launch with <code className="text-xs bg-muted px-1.5 py-0.5 rounded">npm run tauri:dev</code>
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className={cn(
        "hidden md:flex flex-col overflow-hidden rounded-b-none",
        !isDesktop() && "md:hidden", // Completely hide if not Tauri
        expanded && "fixed inset-4 z-50",
        fullPage && !expanded && "flex-1",
        isFullscreen && "fixed inset-0 z-[9999] rounded-none border-none",
      )}>
      {/* Top Tab Bar */}
      <div className={cn("relative z-50 flex items-center bg-muted/30 border-b border-border overflow-x-auto shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", isFullscreen && "hidden")}>
        <div 
          className="flex items-center flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          {sortedGroups.map((group) => {
            const gTabs = tabsByGroup(group.groupId);
            return (
              <div key={group.groupId} className="flex items-center shrink-0">
                {renderGroupHeader(group, gTabs.length)}
                {!group.collapsed && gTabs.map((tab) => renderTab(tab, group.color))}
              </div>
            );
          })}
          {ungroupedTabs.map((tab) => renderTab(tab))}
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => addTab()} title="New tab">
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <div className="flex items-center gap-0.5 pr-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarView(sidebarView === "all-tabs" ? null : "all-tabs")} title="All Tabs">
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarView(sidebarView === "groups" ? null : "groups")} title="Tab Groups">
            <Layers className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarView(sidebarView === "extensions" ? null : "extensions")} title="Extensions">
            <Puzzle className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
            const url = activeTab?.url;
            if (!url) return;
            if (isDesktop()) {
              try {
                const { open } = await import("@tauri-apps/plugin-shell");
                await open(url);
              } catch (e) {
                logger.error("Shell open failed, trying fallback:", e);
                window.open(url, "_blank");
              }
            } else {
              window.open(url, "_blank");
            }
          }} title="Open externally">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)} title={expanded ? "Minimize" : "Maximize"}>
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          {/* <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Exit Full Screen Monitor" : "Full Screen Monitor"}>
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-emerald-500" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button> */}
        </div>
      </div>

      {/* Main Toolbar */}
      <div className={cn("relative z-40 flex items-center gap-1.5 px-2 py-1.5 border-b border-border shrink-0", isFullscreen && "hidden")}>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { 
          try { 
            if (useDesktopIframeShell) {
                iframeRef.current?.contentWindow?.history.back();
              } else if (isDesktop() && embeddedWebviewTabIdsRef.current.has(activeTabId)) {
                const label = tauriWebviewLabelForTabId(activeTabId);
                import("@tauri-apps/api/core").then(({ invoke }) => {
                  invoke("webview_action", { label, action: "goBack" }).catch(() => {});
                });
              }
          } catch (err) { logger.error("back navigation error:", err) } 
        }} title="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { 
          try { 
            if (useDesktopIframeShell) {
              iframeRef.current?.contentWindow?.history.forward();
            } else if (isDesktop() && embeddedWebviewTabIdsRef.current.has(activeTabId)) {
              const label = tauriWebviewLabelForTabId(activeTabId);
              import("@tauri-apps/api/core").then(({ invoke }) => {
                invoke("webview_action", { label, action: "goForward" }).catch(() => {});
              });
            }
          } catch (err) { logger.error("forward navigation error:", err) } 
        }} title="Forward">
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => {
            try {
              if (activeTab?.isLoading) { /* no-op */ } else if (activeTab?.url) { 
                if (useDesktopIframeShell) {
                  iframeRef.current?.contentWindow?.location.reload();
                } else if (isDesktop() && embeddedWebviewTabIdsRef.current.has(activeTabId)) {
                  const label = tauriWebviewLabelForTabId(activeTabId);
                  import("@tauri-apps/api/core").then(({ invoke }) => {
                    invoke("webview_action", { label, action: "reload" }).catch(() => {});
                  });
                } else {
                  navigate(activeTab.url);
                }
              }
            } catch (err) { logger.error("reload navigation error:", err) }
          }}
          title={activeTab?.isLoading ? "Stop" : "Reload"}
        >
          {activeTab?.isLoading ? <X className="h-4 w-4" /> : <RotateCw className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          type="button"
          title="Home"
          onClick={() => navigate(DEFAULT_URL)}
        >
          <Home className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" type="button" title="History" onClick={() => setSidebarView(sidebarView === "history" ? null : "history")}>
           <History className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          type="button"
          title="Copy URL"
          onClick={() => void copyCurrentUrl()}
        >
          <Copy className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" type="button" title="More" onClick={() => setSidebarView(sidebarView === "menu" ? null : "menu")}>
           <MoreVertical className="h-4 w-4" />
        </Button>

        <form onSubmit={handleSubmit} className="flex-1">
          <div className="relative">
            {activeTab?.isSecure && (
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
            )}
            <input
              ref={urlInputRef}
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onFocus={(e) => {
                urlBarFocusedRef.current = true;
                e.target.select();
              }}
              onBlur={() => {
                urlBarFocusedRef.current = false;
              }}
              className={cn(
                "w-full h-7 rounded-md bg-muted/50 border border-input text-xs px-3 focus:outline-none focus:ring-1 focus:ring-ring",
                activeTab?.isSecure && "pl-8"
              )}
              placeholder="Search or enter URL"
            />
          </div>
        </form>
      </div>

      {/* Main Flex Area: Left is Webview, Right is Sidebar */}
      <CardContent className="relative z-0 flex-1 flex overflow-hidden p-0">
        
        {/* Left Webview Container */}
        <div className="relative flex-1 overflow-hidden" ref={containerRef}>
          <div
            className="absolute inset-0"
            onPointerDownCapture={() => {
              if (!isDesktop() || useDesktopIframeShell) return;
              const id = activeTabIdRef.current;
              if (!id || !embeddedWebviewTabIdsRef.current.has(id)) return;
              const label = tauriWebviewLabelForTabId(id);
              void import("@tauri-apps/api/core").then(({ invoke }) => {
                invoke("embedded_browser_focus", { label }).catch((err) => logger.error("focus error:", err));
              });
            }}
          >
            {useDesktopIframeShell && activeTab ? (
              <iframe
                key={activeTab.id}
                ref={iframeRef}
                src={activeTab.url}
                className="absolute inset-0 h-full w-full border-0 bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                title={activeTab.title || "Browser"}
                allow="fullscreen"
              />
            ) : null}
          </div>
          
          {/* Find Bar Overlay (Sits at the bottom of the container) */}
          {findOpen ? (
            <div className="absolute bottom-2 left-2 right-2 z-50 flex items-center gap-1.5 rounded-lg border border-border bg-popover px-2 py-1.5 shadow-lg">
              <SearchIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                ref={findInputRef}
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runFindStep(!e.shiftKey);
                  }
                  if (e.key === "Escape") {
                    setFindOpen(false);
                    setFindText("");
                  }
                }}
                className="h-7 min-w-0 flex-1 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
                placeholder="Find in page…"
                aria-label="Find in page"
              />
              {findMeta && findMeta.total > 0 ? (
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {findMeta.current}/{findMeta.total}
                </span>
              ) : null}
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Previous match" onClick={() => runFindStep(false)}>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Next match" onClick={() => runFindStep(true)}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Close" onClick={() => { setFindOpen(false); setFindText(""); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>

        {/* Right Sidebar Architecture */}
        {sidebarView && (
          <div className="w-[280px] bg-card border-l border-border flex flex-col shrink-0 z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {sidebarView === "history" && "History"}
                {sidebarView === "extensions" && "Extensions"}
                {sidebarView === "menu" && "Settings"}
                {sidebarView === "groups" && "Tab Groups"}
                {sidebarView === "all-tabs" && "All Tabs"}
                {sidebarView === "tab-actions" && "Tab Actions"}
                {sidebarView === "group-edit" && "Edit Group"}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidebarView(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              
              {/* HISTORY PANEL */}
              {sidebarView === "history" && (
                <div className="flex flex-col gap-1">
                  {visitHistory.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">No history yet</p>
                  ) : (
                    visitHistory.map((h, idx) => (
                      <button
                        key={`${h.url}-${idx}`}
                        className="flex w-full flex-col gap-0.5 px-3 py-2 text-left rounded-md text-xs hover:bg-muted"
                        onClick={() => {
                          navigate(h.url);
                          setSidebarView(null);
                        }}
                      >
                        <span className="truncate font-medium text-foreground">{h.title}</span>
                        <span className="truncate text-[10px] text-muted-foreground">{h.url}</span>
                      </button>
                    ))
                  )}
                  {visitHistory.length > 0 && (
                    <Button variant="outline" size="sm" className="mt-4 w-full text-xs" onClick={() => { setVisitHistory([]); void saveVisitHistory([]); toast.success("History cleared"); }}>
                      Clear History
                    </Button>
                  )}
                </div>
              )}

              {/* EXTENSIONS PANEL */}
              {sidebarView === "extensions" && (
                <div className="flex flex-col gap-2">
                  {extensions.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">No extensions installed</p>
                  ) : (
                    extensions.map((ext) => (
                      <div key={ext.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                        <span className="truncate text-xs font-medium">{ext.name} {ext.version && <span className="font-normal text-muted-foreground">v{ext.version}</span>}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-red-500 shrink-0" onClick={async () => {
                            const api = getExtensionsAPI();
                            if (!api) return;
                            await api.remove(ext.id);
                            refreshExtensions();
                            toast.success(`Removed ${ext.name}`);
                          }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                  <div className="h-px bg-border my-2" />
                  <Button variant="secondary" size="sm" className="w-full text-xs justify-start" onClick={async () => {
                    const api = getExtensionsAPI();
                    if (!api) return;
                    const result = await api.loadFolder();
                    if (result.success) { toast.success(`Installed ${result.name}`); refreshExtensions(); }
                    else if (result.error) toast.error(result.error);
                  }}>
                    <FolderOpen className="h-3.5 w-3.5 mr-2" /> Load unpacked...
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full text-xs justify-start" onClick={() => { getExtensionsAPI()?.openFolder(); }}>
                    <FolderOpen className="h-3.5 w-3.5 mr-2" /> Open folder
                  </Button>
                </div>
              )}

              {/* MORE MENU PANEL */}
              {sidebarView === "menu" && (
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="sm" className="w-full text-xs justify-start" onClick={() => { setFindOpen(true); setSidebarView(null); }}>
                    <SearchIcon className="mr-2 h-3.5 w-3.5" /> Find in page
                  </Button>
                  <div className="h-px bg-border my-2" />
                  <Button variant="ghost" size="sm" className="w-full text-xs justify-start" onClick={() => void clearBrowserCache()}>
                     Clear embedded cache
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full text-xs justify-start" onClick={() => void clearBrowserStorage()}>
                     Clear cookies & site data
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full text-xs justify-start text-red-400 hover:text-red-500 hover:bg-red-500/10" onClick={() => void clearBrowserAll()}>
                     Clear everything (Hard Reset)
                  </Button>
                </div>
              )}

              {/* ALL TABS PANEL */}
              {sidebarView === "all-tabs" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    {tabs.map((tab) => {
                      const isActive = tab.id === activeTabId;
                      const colors = tab.groupId ? COLOR_MAP[groups.find(g => g.groupId === tab.groupId)?.color || "blue"] : null;
                      return (
                        <div key={tab.id} className={cn("flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer", isActive && "bg-muted font-medium")} onClick={() => { setActiveTabId(tab.id); setSidebarView(null); }}>
                          <div className="flex flex-1 min-w-0 items-center gap-2">
                            {tab.isLoading ? <RotateCw className="h-3 w-3 animate-spin shrink-0" /> : tab.isSecure ? <Lock className="h-3 w-3 text-emerald-500 shrink-0" /> : <Globe className="h-3 w-3 shrink-0" />}
                            <span className="text-xs truncate flex-1">{tab.title}</span>
                            {colors && <span className={cn("h-2 w-2 rounded-full shrink-0 ml-1", colors.dot)} title="Group" />}
                          </div>
                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-50 hover:opacity-100 hover:text-red-500 ml-2" onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* GROUPS PANEL */}
              {sidebarView === "groups" && (
                <div className="flex flex-col gap-2">
                  <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => createGroup()}>
                    <Plus className="h-3.5 w-3.5 mr-2" /> Create New Group
                  </Button>
                  <div className="h-px bg-border my-2" />
                  {groups.length === 0 && <p className="text-center text-xs text-muted-foreground mt-4">No groups exist</p>}
                  {groups.map((g) => {
                    const colors = COLOR_MAP[g.color];
                    return (
                      <div key={g.groupId} className="flex items-center justify-between p-2 bg-muted/30 rounded-md border border-border">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", colors.dot)} />
                          <span className="text-xs font-medium truncate">{g.name}</span>
                          <span className="text-[10px] text-muted-foreground">({tabsByGroup(g.groupId).length})</span>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingGroupId(g.groupId); setEditingName(g.name); setSidebarView("group-edit"); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-red-500" onClick={() => deleteGroup(g.groupId)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB ACTIONS PANEL */}
              {sidebarView === "tab-actions" && contextTabId && (
                <div className="flex flex-col gap-1">
                  <Button variant="secondary" size="sm" className="w-full text-xs justify-start" onClick={() => { closeTab(contextTabId); setSidebarView(null); }}>
                    Close Tab
                  </Button>
                  <div className="h-px bg-border my-2" />
                  <span className="px-2 text-[10px] font-semibold text-muted-foreground uppercase">Move to Group</span>
                  <Button variant="ghost" size="sm" className="w-full text-xs justify-start" onClick={() => { createGroup(contextTabId); }}>
                    <Plus className="h-3.5 w-3.5 mr-2" /> New Group
                  </Button>
                  {groups.map((g) => {
                    const colors = COLOR_MAP[g.color];
                    const isInGroup = tabs.find((t) => t.id === contextTabId)?.groupId === g.groupId;
                    return (
                      <Button key={g.groupId} variant="ghost" size="sm" className="w-full text-xs justify-start" onClick={() => moveTabToGroup(contextTabId, g.groupId)}>
                        <span className={cn("h-2 w-2 rounded-full shrink-0 mr-2", colors.dot)} />
                        <span className="flex-1 text-left truncate">{g.name}</span>
                        {isInGroup && <Check className="h-3 w-3 text-emerald-500" />}
                      </Button>
                    );
                  })}
                  {tabs.find((t) => t.id === contextTabId)?.groupId && (
                    <>
                      <div className="h-px bg-border my-2" />
                      <Button variant="outline" size="sm" className="w-full text-xs justify-start" onClick={() => ungroupTab(contextTabId)}>
                        Remove from current group
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* EDIT GROUP PANEL */}
              {sidebarView === "group-edit" && editingGroupId && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 block px-1">Group Name</label>
                    <form onSubmit={(e) => { e.preventDefault(); renameGroup(editingGroupId, editingName); toast.success("Renamed"); }}>
                      <Input 
                        autoFocus 
                        value={editingName} 
                        onChange={(e) => setEditingName(e.target.value)} 
                        onBlur={() => renameGroup(editingGroupId, editingName)}
                        className="h-8 text-xs" 
                      />
                    </form>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-2 block px-1">Group Color</label>
                    <div className="flex flex-wrap gap-2 px-1">
                      {GROUP_COLORS.map((c) => {
                        const colors = COLOR_MAP[c];
                        const isActive = groups.find((g) => g.groupId === editingGroupId)?.color === c;
                        return (
                          <button
                            key={c}
                            className={cn(
                              "h-6 w-6 rounded-full transition-all",
                              colors.dot,
                              isActive && "ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110"
                            )}
                            onClick={() => changeGroupColor(editingGroupId, c)}
                            title={c}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </CardContent>
    </Card>
      <AlertDialog open={showClearStorageDialog} onOpenChange={setShowClearStorageDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Site Data</AlertDialogTitle>
            <AlertDialogDescription>
              Clear all cookies and site data for the embedded browser? You will be signed out of sites in this browser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeClearBrowserStorage} className="bg-destructive hover:bg-destructive/90">
              Clear Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cache and Data</AlertDialogTitle>
            <AlertDialogDescription>
              Clear cache and all site data for the embedded browser?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeClearBrowserAll} className="bg-destructive hover:bg-destructive/90">
              Clear All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}