#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use anyhow::Result;
use serde::Serialize;
use std::{fs, path::PathBuf};
use tauri::webview::{PageLoadEvent, WebviewBuilder};
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl};
use std::fs::File;
use zip::read::ZipArchive;
use std::process::Command;

/// Windows WebView2 reports as Edge unless overridden; many sites behave better with a Chrome UA.
#[cfg(target_os = "windows")]
const EMBEDDED_BROWSER_USER_AGENT: &str = concat!(
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ",
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
);

#[derive(Serialize)]
struct ExtensionInfo {
  id: String,
  name: String,
  version: Option<String>,
  path: Option<String>,
}

fn extensions_dir(app: &AppHandle) -> PathBuf {
  let mut dir = app
    .path()
    .app_local_data_dir()
    .unwrap_or_else(|_| app.path().app_data_dir().unwrap_or_default());
  dir.push("extensions");
  dir
}

fn ensure_dir(p: &PathBuf) -> Result<()> {
  if !p.exists() {
    fs::create_dir_all(p)?;
  }
  Ok(())
}

fn copy_dir_recursive(from: &PathBuf, to: &PathBuf) -> Result<()> {
  ensure_dir(to)?;
  for entry in fs::read_dir(from)? {
    let entry = entry?;
    let src = entry.path();
    let mut dst = to.clone();
    dst.push(entry.file_name());
    if entry.file_type()?.is_dir() {
      copy_dir_recursive(&src, &dst)?;
    } else {
      fs::copy(&src, &dst)?;
    }
  }
  Ok(())
}

#[tauri::command]
fn extensions_open_folder(app: AppHandle) -> Result<(), String> {
  let dir = extensions_dir(&app);
  ensure_dir(&dir).map_err(|e| e.to_string())?;
  let path_str = dir.to_string_lossy().to_string();
  #[cfg(target_os = "windows")]
  {
    Command::new("cmd")
      .args(["/C", "start", "", &path_str])
      .status()
      .map_err(|e| e.to_string())?;
  }
  #[cfg(target_os = "macos")]
  {
    Command::new("open")
      .arg(&path_str)
      .status()
      .map_err(|e| e.to_string())?;
  }
  #[cfg(all(unix, not(target_os = "macos")))]
  {
    Command::new("xdg-open")
      .arg(&path_str)
      .status()
      .map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn extensions_list(app: AppHandle) -> Result<Vec<ExtensionInfo>, String> {
  let dir = extensions_dir(&app);
  ensure_dir(&dir).map_err(|e| e.to_string())?;
  let mut out = Vec::new();
  let read = fs::read_dir(&dir).map_err(|e| e.to_string())?;
  for entry in read {
    if let Ok(entry) = entry {
      let path = entry.path();
      if path.is_dir() {
        let mut manifest = path.clone();
        manifest.push("manifest.json");
        if manifest.exists() {
          let raw = fs::read_to_string(&manifest).unwrap_or_default();
          let name = json_extract(&raw, "name").unwrap_or_else(|| entry.file_name().to_string_lossy().to_string());
          let version = json_extract(&raw, "version");
          let id = entry.file_name().to_string_lossy().to_string();
          out.push(ExtensionInfo { id, name, version, path: Some(path.to_string_lossy().to_string()) });
        }
      }
    }
  }
  Ok(out)
}

#[tauri::command]
fn extensions_remove(app: AppHandle, id: String) -> Result<serde_json::Value, String> {
  let mut dir = extensions_dir(&app);
  dir.push(id);
  if dir.exists() {
    fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
  }
  Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
fn extensions_add_from_folder(app: AppHandle, path: String) -> Result<serde_json::Value, String> {
  let src = PathBuf::from(path);
  if !src.is_dir() {
    return Err("Selected path is not a directory".into());
  }
  let mut manifest = src.clone();
  manifest.push("manifest.json");
  if !manifest.exists() {
    return Err("Folder must contain a manifest.json".into());
  }
  let name = json_extract(&fs::read_to_string(&manifest).unwrap_or_default(), "name")
    .unwrap_or_else(|| src.file_name().unwrap_or_default().to_string_lossy().to_string());
  let mut dest = extensions_dir(&app);
  ensure_dir(&dest).map_err(|e| e.to_string())?;
  let folder = src.file_name().unwrap_or_default().to_string_lossy().to_string();
  dest.push(folder);
  if dest.exists() {
    fs::remove_dir_all(&dest).map_err(|e| e.to_string())?;
  }
  copy_dir_recursive(&src, &dest).map_err(|e| e.to_string())?;
  Ok(serde_json::json!({ "success": true, "name": name, "id": dest.file_name().unwrap_or_default().to_string_lossy().to_string() }))
}

fn json_extract(raw: &str, key: &str) -> Option<String> {
  let v: serde_json::Value = serde_json::from_str(raw).ok()?;
  v.get(key).and_then(|x| x.as_str()).map(|s| s.to_string())
}

fn download_file(url: &str, dest: &PathBuf) -> Result<()> {
  let resp = reqwest::blocking::get(url)?;
  if !resp.status().is_success() {
    anyhow::bail!("HTTP {}", resp.status());
  }
  let mut out = File::create(dest)?;
  let content = resp.bytes()?;
  std::io::copy(&mut content.as_ref(), &mut out)?;
  Ok(())
}

fn unzip_to_dir(zip_path: &PathBuf, dest_dir: &PathBuf) -> Result<()> {
  ensure_dir(dest_dir)?;
  let file = File::open(zip_path)?;
  let mut archive = ZipArchive::new(file)?;
  for i in 0..archive.len() {
    let mut file = archive.by_index(i)?;
    let outpath = {
      let mut p = dest_dir.clone();
      let name = file.enclosed_name().ok_or_else(|| anyhow::anyhow!("invalid path"))?;
      p.push(name);
      p
    };
    if file.is_dir() {
      ensure_dir(&outpath)?;
    } else {
      if let Some(parent) = outpath.parent() {
        ensure_dir(&parent.to_path_buf())?;
      }
      let mut outfile = File::create(&outpath)?;
      std::io::copy(&mut file, &mut outfile)?;
    }
  }
  Ok(())
}

fn flatten_if_needed(dir: &PathBuf) -> bool {
  let mut manifest = dir.clone();
  manifest.push("manifest.json");
  if manifest.exists() {
    return true;
  }
  if let Ok(entries) = fs::read_dir(dir) {
    for entry in entries.flatten() {
      let sub = entry.path();
      if sub.is_dir() {
        let mut m = sub.clone();
        m.push("manifest.json");
        if m.exists() {
          if let Ok(inner) = fs::read_dir(&sub) {
            for f in inner.flatten() {
              let src = f.path();
              let mut dst = dir.clone();
              dst.push(f.file_name());
              let _ = fs::rename(&src, &dst).or_else(|_| {
                if f.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                  copy_dir_recursive(&src, &dst)
                } else {
                  fs::copy(&src, &dst).map(|_| ()).map_err(|e| e.into())
                }
              });
            }
          }
          let _ = fs::remove_dir_all(&sub);
          return true;
        }
      }
    }
  }
  false
}

#[tauri::command]
fn extensions_download_ublock(app: AppHandle) -> Result<serde_json::Value, String> {
  let base = extensions_dir(&app);
  ensure_dir(&base).map_err(|e| e.to_string())?;
  let mut ubo_dir = base.clone();
  ubo_dir.push("ublock-origin");
  let mut manifest = ubo_dir.clone();
  manifest.push("manifest.json");
  if manifest.exists() {
    return Ok(serde_json::json!({ "success": true, "installed": true }));
  }
  let api_url = "https://api.github.com/repos/gorhill/uBlock/releases/latest";
  let client = reqwest::blocking::Client::builder()
    .user_agent("Dayframe/1.0")
    .build()
    .map_err(|e| e.to_string())?;
  let resp = client.get(api_url).send().map_err(|e| e.to_string())?;
  let json: serde_json::Value = resp.json().map_err(|e| e.to_string())?;
  let assets = json.get("assets").and_then(|a| a.as_array()).ok_or_else(|| "No assets".to_string())?;
  let url = assets.iter().filter_map(|a| {
    let name = a.get("name")?.as_str()?;
    if name.to_lowercase().contains("chromium") && name.to_lowercase().ends_with(".zip") {
      a.get("browser_download_url")?.as_str().map(|s| s.to_string())
    } else { None }
  }).next().ok_or_else(|| "No chromium zip asset".to_string())?;
  let mut zip_path = base.clone();
  zip_path.push("ubo-download.zip");
  download_file(&url, &zip_path).map_err(|e| e.to_string())?;
  let _ = fs::remove_dir_all(&ubo_dir);
  unzip_to_dir(&zip_path, &ubo_dir).map_err(|e| e.to_string())?;
  let _ = fs::remove_file(&zip_path);
  let _ = flatten_if_needed(&ubo_dir);
  Ok(serde_json::json!({ "success": true, "installed": true }))
}

#[tauri::command]
fn find_in_page(app: AppHandle, label: String, text: String, forward: bool) -> Result<(), String> {
  if let Some(w) = app.get_webview(&label) {
    let script = format!(
      "window.find('{}', false, {}, true, false, false, false);",
      text.replace("'", "\\'"),
      if forward { "false" } else { "true" }
    );
    w.eval(&script).map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn stop_find_in_page(app: AppHandle, label: String) -> Result<(), String> {
  if let Some(w) = app.get_webview(&label) {
    w.eval("window.getSelection().removeAllRanges();")
      .map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn webview_action(app: AppHandle, label: String, action: String) -> Result<(), String> {
  if let Some(w) = app.get_webview(&label) {
    let script = match action.as_str() {
      "goBack" => "window.history.back();",
      "goForward" => "window.history.forward();",
      "reload" => "window.location.reload();",
      _ => "",
    };
    if !script.is_empty() {
      w.eval(script).map_err(|e| e.to_string())?;
    }
  }
  Ok(())
}

/// Create a second webview inside the main window via `Window::add_child` (not a separate `WebviewWindow`).
/// Must be `async` on Windows to avoid WebView2 deadlocks when creating windows from commands.
#[tauri::command]
async fn embedded_browser_create_tab(
  app: AppHandle,
  parent_label: String,
  label: String,
  target_url: String,
  viewport_x: f64,
  viewport_y: f64,
  width: f64,
  height: f64,
  user_id: Option<String>,
) -> Result<(), String> {
  let parsed = url::Url::parse(&target_url).map_err(|e| e.to_string())?;
  if parsed.scheme() != "http" && parsed.scheme() != "https" {
    return Err("Only http(s) URLs are allowed".into());
  }

  let window = app
    .get_window(&parent_label)
    .ok_or_else(|| format!("Parent window not found: {parent_label}"))?;

  let w = width.max(10.0);
  let h = height.max(10.0);
  let pos = LogicalPosition::new(viewport_x, viewport_y);
  let size = LogicalSize::new(w, h);

  if let Some(existing) = app.get_webview(&label) {
    existing
      .set_position(pos)
      .map_err(|e| e.to_string())?;
    existing
      .set_size(size)
      .map_err(|e| e.to_string())?;
    return Ok(());
  }

  let mut data_dir = app
    .path()
    .app_local_data_dir()
    .unwrap_or_else(|_| app.path().app_data_dir().unwrap_or_default());
  if let Some(uid) = user_id {
      data_dir.push(format!("sessions/{}", uid));
  } else {
      data_dir.push("sessions/default");
  }
  ensure_dir(&data_dir).unwrap_or_default();

  #[cfg(not(target_os = "windows"))]
  let builder = {
    let app_emit = app.clone();
    let label_emit = label.clone();
    let ext_dir = extensions_dir(&app);
    WebviewBuilder::new(&label, WebviewUrl::External(parsed))
      .data_directory(data_dir)
      .browser_extensions_enabled(true)
      .extensions_path(ext_dir)
      .initialization_script(r#"
        (function() {
            document.addEventListener('keydown', (e) => {
                const k = (e.key || '').toLowerCase();
                const ctrl = e.ctrlKey || e.metaKey;
                const shift = e.shiftKey;
                if ((ctrl && ['w','t','r','f','l','tab'].includes(k)) || k === 'f5' || k === 'escape' || (ctrl && /^[1-9]$/.test(k))) {
                    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
                    fetch('dfcmd://shortcut/?k=' + encodeURIComponent(k) + '&ctrl=' + (ctrl?'1':'0') + '&shift=' + (shift?'1':'0')).catch(()=>{});
                    return false;
                }
            }, true);

            const hostname = window.location.hostname || '';
            const isSafe = hostname.includes('google.') || hostname.includes('youtube.') || hostname.includes('github.') || hostname.includes('x.com') || hostname.includes('twitter.') || hostname.includes('grok.com');
            if (isSafe) return;

            const noop = function() { return null; };
            if (window.open !== noop) window.open = noop;
            setInterval(() => { if (window.open !== noop) window.open = noop; }, 100);

            try {
                const origSetAttribute = Element.prototype.setAttribute;
                Element.prototype.setAttribute = function(name, val) {
                    if ((this.tagName === 'SCRIPT' || this.tagName === 'IFRAME') && typeof name === 'string' && name.toLowerCase() === 'src') {
                        let v = (val || '').toLowerCase();
                        if (v.includes('adsystem') || v.includes('popunder') || v.includes('propeller') || v.includes('adcash') || v.includes('wzrk') || v.includes('doubleclick') || v.includes('exoclick') || v.includes('onclick')) return;
                    }
                    origSetAttribute.call(this, name, val);
                };
            } catch(e) {}

            const enforceStyles = () => {
                if (!document.getElementById('df-adblock')) {
                    const style = document.createElement('style');
                    style.id = 'df-adblock';
                    style.innerHTML = 'iframe[src*="doubleclick.net"], iframe[src*="adsystem"], iframe[name*="google_ads"], .ad-container, .ad-slot, .adsbygoogle, .video-ad, .mgbox, div[style*="z-index: 2147483647"], div[style*="z-index: 999999"], div[style*="z-index: 2147483646"], div[style*="z-index: 9999"], #uverlay, .pop-under, .ad-overlay, .wzrk-overlay, [id^="popunder"], div[id*="ScriptRoot"], div[class*="ads-wrapper"], div[class*="popup-layer"], .ad-unit { display: none !important; opacity: 0 !important; pointer-events: none !important; }';
                    if (document.documentElement) (document.head || document.documentElement).appendChild(style);
                }
            };
            enforceStyles();
            setInterval(enforceStyles, 500);

            setInterval(() => {
                try {
                    const iter = document.createNodeIterator(document.body, NodeFilter.SHOW_TEXT);
                    let node;
                    while ((node = iter.nextNode())) {
                        let text = (node.nodeValue || '').trim().toLowerCase();
                        if (text === 'ad' || text.includes('cashback') || text.includes('bonus') || text.includes('play like a champion') || text.includes('free spins')) {
                            let parent = node.parentNode;
                            let maxClimb = 12;
                            while(parent && parent.tagName !== 'BODY' && maxClimb > 0) {
                                let st = window.getComputedStyle(parent);
                                if (st.position === 'absolute' || st.position === 'fixed' || parseInt(st.zIndex || '0') > 10) {
                                    parent.style.setProperty('display', 'none', 'important');
                                    parent.style.setProperty('opacity', '0', 'important');
                                    parent.style.setProperty('pointer-events', 'none', 'important');
                                    break;
                                }
                                parent = parent.parentNode;
                                maxClimb--;
                            }
                        }
                    }
                    
                    if (document.body && document.body.children) {
                        for (let i = 0; i < document.body.children.length; i++) {
                            let el = document.body.children[i];
                            if (!el || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'VIDEO') continue;
                            let st = window.getComputedStyle(el);
                            if ((st.position === 'absolute' || st.position === 'fixed') && parseInt(st.zIndex || '0') > 900) {
                                el.style.setProperty('display', 'none', 'important');
                                el.style.setProperty('pointer-events', 'none', 'important');
                            }
                        }
                    }

                    document.querySelectorAll('iframe').forEach(ifr => {
                        let src = (ifr.src || '').toLowerCase();
                        if (src.includes('adsystem') || src.includes('propeller') || src.includes('popunder') || src.includes('adcash')) {
                            ifr.style.setProperty('display', 'none', 'important');
                        }
                    });
                } catch(e) {}
            }, 800);

            document.addEventListener('click', (e) => {
                let current = e.target;
                while (current && current !== document.body) {
                    if (current.tagName === 'A' && current.target === '_blank') {
                        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return false;
                    }
                    current = current.parentNode;
                }
            }, true);
        })();
      "#)
      .on_page_load(move |_w, payload| {
        if payload.event() != PageLoadEvent::Finished {
          return;
        }
        let url_string = payload.url().to_string();
        let _ = app_emit.emit(
          "embedded-browser-navigated",
          serde_json::json!({ "label": label_emit, "url": url_string }),
        );
      })
  };
  #[cfg(target_os = "windows")]
  let builder = {
    let app_emit = app.clone();
    let label_emit = label.clone();
    let ext_dir = extensions_dir(&app);
    WebviewBuilder::new(&label, WebviewUrl::External(parsed))
      .data_directory(data_dir)
      .browser_extensions_enabled(true)
      .extensions_path(ext_dir)
      .user_agent(EMBEDDED_BROWSER_USER_AGENT)
      .initialization_script(r#"
        (function() {
            document.addEventListener('keydown', (e) => {
                const k = (e.key || '').toLowerCase();
                const ctrl = e.ctrlKey || e.metaKey;
                const shift = e.shiftKey;
                if ((ctrl && ['w','t','r','f','l','tab'].includes(k)) || k === 'f5' || k === 'escape' || (ctrl && /^[1-9]$/.test(k))) {
                    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
                    fetch('dfcmd://shortcut/?k=' + encodeURIComponent(k) + '&ctrl=' + (ctrl?'1':'0') + '&shift=' + (shift?'1':'0')).catch(()=>{});
                    return false;
                }
            }, true);

            const hostname = window.location.hostname || '';
            const isSafe = hostname.includes('google.') || hostname.includes('youtube.') || hostname.includes('github.') || hostname.includes('x.com') || hostname.includes('twitter.') || hostname.includes('grok.com');
            if (isSafe) return;

            const noop = function() { return null; };
            if (window.open !== noop) window.open = noop;
            setInterval(() => { if (window.open !== noop) window.open = noop; }, 100);

            try {
                const origSetAttribute = Element.prototype.setAttribute;
                Element.prototype.setAttribute = function(name, val) {
                    if ((this.tagName === 'SCRIPT' || this.tagName === 'IFRAME') && typeof name === 'string' && name.toLowerCase() === 'src') {
                        let v = (val || '').toLowerCase();
                        if (v.includes('adsystem') || v.includes('popunder') || v.includes('propeller') || v.includes('adcash') || v.includes('wzrk') || v.includes('doubleclick') || v.includes('exoclick') || v.includes('onclick')) return;
                    }
                    origSetAttribute.call(this, name, val);
                };
            } catch(e) {}

            const enforceStyles = () => {
                if (!document.getElementById('df-adblock')) {
                    const style = document.createElement('style');
                    style.id = 'df-adblock';
                    style.innerHTML = 'iframe[src*="doubleclick.net"], iframe[src*="adsystem"], iframe[name*="google_ads"], .ad-container, .ad-slot, .adsbygoogle, .video-ad, .mgbox, div[style*="z-index: 2147483647"], div[style*="z-index: 999999"], div[style*="z-index: 2147483646"], div[style*="z-index: 9999"], #uverlay, .pop-under, .ad-overlay, .wzrk-overlay, [id^="popunder"], div[id*="ScriptRoot"], div[class*="ads-wrapper"], div[class*="popup-layer"], .ad-unit { display: none !important; opacity: 0 !important; pointer-events: none !important; }';
                    if (document.documentElement) (document.head || document.documentElement).appendChild(style);
                }
            };
            enforceStyles();
            setInterval(enforceStyles, 500);

            setInterval(() => {
                try {
                    const iter = document.createNodeIterator(document.body, NodeFilter.SHOW_TEXT);
                    let node;
                    while ((node = iter.nextNode())) {
                        let text = (node.nodeValue || '').trim().toLowerCase();
                        if (text === 'ad' || text.includes('cashback') || text.includes('bonus') || text.includes('play like a champion') || text.includes('free spins')) {
                            let parent = node.parentNode;
                            let maxClimb = 12;
                            while(parent && parent.tagName !== 'BODY' && maxClimb > 0) {
                                let st = window.getComputedStyle(parent);
                                if (st.position === 'absolute' || st.position === 'fixed' || parseInt(st.zIndex || '0') > 10) {
                                    parent.style.setProperty('display', 'none', 'important');
                                    parent.style.setProperty('opacity', '0', 'important');
                                    parent.style.setProperty('pointer-events', 'none', 'important');
                                    break;
                                }
                                parent = parent.parentNode;
                                maxClimb--;
                            }
                        }
                    }
                    
                    if (document.body && document.body.children) {
                        for (let i = 0; i < document.body.children.length; i++) {
                            let el = document.body.children[i];
                            if (!el || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'VIDEO') continue;
                            let st = window.getComputedStyle(el);
                            if ((st.position === 'absolute' || st.position === 'fixed') && parseInt(st.zIndex || '0') > 900) {
                                el.style.setProperty('display', 'none', 'important');
                                el.style.setProperty('pointer-events', 'none', 'important');
                            }
                        }
                    }

                    document.querySelectorAll('iframe').forEach(ifr => {
                        let src = (ifr.src || '').toLowerCase();
                        if (src.includes('adsystem') || src.includes('propeller') || src.includes('popunder') || src.includes('adcash')) {
                            ifr.style.setProperty('display', 'none', 'important');
                        }
                    });
                } catch(e) {}
            }, 800);

            document.addEventListener('click', (e) => {
                let current = e.target;
                while (current && current !== document.body) {
                    if (current.tagName === 'A' && current.target === '_blank') {
                        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return false;
                    }
                    current = current.parentNode;
                }
            }, true);
        })();
      "#)
      .on_page_load(move |_w, payload| {
        if payload.event() != PageLoadEvent::Finished {
          return;
        }
        let url_string = payload.url().to_string();
        let _ = app_emit.emit(
          "embedded-browser-navigated",
          serde_json::json!({ "label": label_emit, "url": url_string }),
        );
      })
  };

  let wv = window
    .add_child(builder, pos, size)
    .map_err(|e| e.to_string())?;
  wv.show().map_err(|e| e.to_string())?;

  Ok(())
}

/// Current document URL (helps sync omnibox for SPAs where load events are sparse).
#[tauri::command]
fn embedded_browser_current_url(app: AppHandle, label: String) -> Result<String, String> {
  let w = app
    .get_webview(&label)
    .ok_or_else(|| format!("Webview not found: {label}"))?;
  w.url()
    .map(|u| u.to_string())
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn embedded_browser_set_bounds(
  app: AppHandle,
  _parent_label: String,
  label: String,
  viewport_x: f64,
  viewport_y: f64,
  width: f64,
  height: f64,
) -> Result<(), String> {
  if let Some(w) = app.get_webview(&label) {
    w.set_position(LogicalPosition::new(viewport_x, viewport_y))
      .map_err(|e| e.to_string())?;
    w.set_size(LogicalSize::new(width.max(10.0), height.max(10.0)))
      .map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn embedded_browser_set_visible(app: AppHandle, label: String, visible: bool) -> Result<(), String> {
  if let Some(w) = app.get_webview(&label) {
    if visible {
      w.show().map_err(|e| e.to_string())?;
    } else {
      w.hide().map_err(|e| e.to_string())?;
    }
  }
  Ok(())
}

#[tauri::command]
fn embedded_browser_focus(app: AppHandle, label: String) -> Result<(), String> {
  if let Some(w) = app.get_webview(&label) {
    w.set_focus().map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn embedded_browser_close(app: AppHandle, label: String) -> Result<(), String> {
  if let Some(w) = app.get_webview(&label) {
    w.close().map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn webview_navigate(app: AppHandle, label: String, url: String) -> Result<(), String> {
  let parsed = url::Url::parse(&url).map_err(|e| e.to_string())?;
  if parsed.scheme() != "http" && parsed.scheme() != "https" {
    return Err("Only http(s) URLs are allowed".into());
  }
  if let Some(w) = app.get_webview(&label) {
    w.navigate(parsed).map_err(|e| e.to_string())?;
  }
  Ok(())
}

/// Hide every embedded tab webview (labels `df-browser-*`) when leaving the browser page — no JS ref snapshot needed.
#[tauri::command]
fn embedded_browser_hide_all_embedded(app: AppHandle) -> Result<(), String> {
  for (label, w) in app.webviews() {
    if label.starts_with("df-browser-") {
      w.hide().map_err(|e| e.to_string())?;
    }
  }
  Ok(())
}

fn main() {
  // Init Tauri
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      extensions_open_folder,
      extensions_list,
      extensions_remove,
      extensions_add_from_folder,
      extensions_download_ublock,
      find_in_page,
      stop_find_in_page,
      webview_action,
      webview_navigate,
      embedded_browser_create_tab,
      embedded_browser_current_url,
      embedded_browser_set_bounds,
      embedded_browser_set_visible,
      embedded_browser_focus,
      embedded_browser_close,
      embedded_browser_hide_all_embedded,
    ])
    .setup(|app| {
      let dir = extensions_dir(&app.handle());
      let _ = ensure_dir(&dir);
      let app_handle = app.handle().clone();
      std::thread::spawn(move || {
        match extensions_download_ublock(app_handle) {
          Ok(v) => eprintln!("[dayframe] uBlock extension: {:?}", v),
          Err(e) => eprintln!("[dayframe] uBlock extension install failed: {e}"),
        }
      });
      Ok(())
    })
    .register_uri_scheme_protocol("dfcmd", |app, req| {
        let uri = req.uri().to_string();
        if uri.contains("shortcut") {
            let q = req.uri().query().unwrap_or("");
            let ctrl = q.contains("ctrl=1");
            let shift = q.contains("shift=1");
            if let Some(pos) = q.find("k=") {
                let start = pos + 2;
                let end = q[start..].find('&').map(|i| start + i).unwrap_or(q.len());
                let k = &q[start..end];
                let _ = app.app_handle().emit("embedded-browser-shortcut", serde_json::json!({
                    "key": k.to_string(),
                    "ctrlKey": ctrl,
                    "shiftKey": shift,
                    "altKey": false,
                    "preventDefault": true
                }));
            }
        }
        tauri::http::Response::builder().status(200).body(Vec::new()).unwrap()
    })
    .run(tauri::generate_context!())
    .expect("error while running Dayframe");
}
