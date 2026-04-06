use tauri::{AppHandle, Manager};
use tauri::http::{Request, Response};

pub fn setup_builder(mut builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.register_uri_scheme_protocol("dfcmd", |_app: &AppHandle, req: &Request<Vec<u8>>| {
        Response::builder().status(200).body(Vec::new()).unwrap()
    })
}
