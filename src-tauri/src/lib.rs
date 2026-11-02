// Folio's desktop app: the web app in a native window. Everything Folio
// does happens in the web app (src/); this side opens the window, lends it
// the system's browser for links that leave Folio (tauri-plugin-opener,
// src/lib/desktop.ts), and files in the app's data folder for what it keeps
// offline (tauri-plugin-fs, src/lib/offline-kv.ts).

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running Folio");
}
