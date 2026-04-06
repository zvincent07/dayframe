use tauri::webview::WebviewBuilder;
fn test() {
    let builder = WebviewBuilder::new("test", tauri::WebviewUrl::External("http://localhost".parse().unwrap()));
    // Let's see if on_message compiles
    let _ = builder.on_message(|webview, payload| { });
}
