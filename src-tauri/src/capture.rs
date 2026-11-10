// Quick capture: a keyboard shortcut that works from any app. Pressing it
// brings Folio to the front and tells the web app to open the note box
// (src/features/desktop/quick-capture). The web app picks the shortcut
// (My settings) and sets it here with capture_set_shortcut.

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutEvent, ShortcutState};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CapturePayload {
    /// Folio wasn't the app in front: after saving, it goes back behind.
    was_in_background: bool,
}

/// The plugin's handler: every registered shortcut is the capture one.
pub fn on_shortcut<R: Runtime>(app: &AppHandle<R>, _shortcut: &Shortcut, event: ShortcutEvent) {
    if !matches!(event.state, ShortcutState::Pressed) {
        return;
    }
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let was_in_background = !window.is_focused().unwrap_or(false)
        || window.is_minimized().unwrap_or(false)
        || !window.is_visible().unwrap_or(true);
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.emit("quick-capture", CapturePayload { was_in_background });
}

/// Sets the capture shortcut ("CommandOrControl+Shift+Space"), or none.
/// Fails when the system or another app already uses it.
#[tauri::command]
pub fn capture_set_shortcut(app: AppHandle, shortcut: Option<String>) -> Result<(), String> {
    let manager = app.global_shortcut();
    manager.unregister_all().map_err(|e| e.to_string())?;
    if let Some(s) = shortcut.filter(|s| !s.is_empty()) {
        manager.register(s.as_str()).map_err(|e| e.to_string())?;
    }
    Ok(())
}
