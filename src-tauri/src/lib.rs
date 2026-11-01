// Folio's desktop app: the web app in a native window. Everything Folio
// does happens in the web app (src/); this side only opens the window and
// lends it the system's browser for links that leave Folio
// (tauri-plugin-opener, called from src/lib/desktop.ts).

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running Folio");
}
