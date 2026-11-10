// Folio's desktop app: the web app in a native window. Everything Folio
// does happens in the web app (src/); this side opens the window, lends it
// the system's browser for links that leave Folio (tauri-plugin-opener,
// src/lib/desktop.ts), files in the app's data folder for what it keeps
// offline (tauri-plugin-fs, src/lib/offline-kv.ts), folio:// links
// (tauri-plugin-deep-link, src/features/desktop/deep-links) and system
// notifications (tauri-plugin-notification,
// src/features/desktop/attention), and new versions from GitHub releases
// (tauri-plugin-updater, then tauri-plugin-process to relaunch,
// src/features/desktop/updater). media.rs saves images, videos, audio and
// files from pages on this computer, so they show offline
// (src/lib/media-cache.ts). backup.rs writes the workspace as Markdown into a
// chosen folder (tauri-plugin-dialog asks which; src/lib/desktop-backup.ts),
// and capture.rs is the quick capture shortcut that works from any app
// (tauri-plugin-global-shortcut; src/features/desktop/quick-capture).

mod backup;
mod capture;
mod media;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // First: a second launch (a folio:// link clicked while Folio runs, on
    // Windows and Linux) hands its link to this one and quits. This window
    // comes to the front.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }));
    }

    // The quick capture shortcut (set by the web app, capture.rs).
    #[cfg(desktop)]
    {
        builder = builder.plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(capture::on_shortcut)
                .build(),
        );
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            media::media_save,
            media::media_list,
            media::media_remove,
            media::media_clear,
            media::media_open,
            media::media_open_folder,
            backup::backup_write,
            backup::backup_pick_folder,
            backup::backup_open_folder,
            capture::capture_set_shortcut,
        ])
        .setup(|_app| {
            // The installer registers folio:// on Windows and Linux; this
            // also does it for `npm run desktop:dev` and the AppImage.
            // macOS reads it from the app bundle.
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                _app.deep_link().register_all()?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Folio");
}
