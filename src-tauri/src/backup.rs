// Backup: the workspace written as Markdown files (and a CSV per database)
// into a folder the person chose (src/lib/desktop-backup.ts builds the
// files; this writes them).
//
// Everything goes in <folder>/<workspace name>/. A manifest there
// (.folio-backup.json) lists the files the last backup wrote, so a page
// renamed, moved or deleted since has its old file removed — and only files
// Folio wrote are ever removed, never anything else in the folder.

use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};

use serde::Deserialize;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

const MANIFEST: &str = ".folio-backup.json";

#[derive(Deserialize)]
pub struct BackupFile {
    /// Relative to the workspace's folder, with "/" between folders.
    path: String,
    content: String,
}

/// A relative path made only of plain names: no "..", no drive, no root.
fn safe_relative(path: &str) -> Option<PathBuf> {
    let p = Path::new(path);
    if p.components().all(|c| matches!(c, Component::Normal(_))) && !path.is_empty() {
        Some(p.to_path_buf())
    } else {
        None
    }
}

fn write_all(base: PathBuf, files: Vec<BackupFile>) -> Result<u32, String> {
    std::fs::create_dir_all(&base).map_err(|e| e.to_string())?;

    let previous: Vec<String> = std::fs::read_to_string(base.join(MANIFEST))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    let mut written: Vec<String> = Vec::new();
    for file in files {
        let Some(rel) = safe_relative(&file.path) else {
            continue;
        };
        let target = base.join(&rel);
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        // Unchanged files are left alone (their dates stay meaningful).
        let same = std::fs::read(&target)
            .map(|old| old == file.content.as_bytes())
            .unwrap_or(false);
        if !same {
            std::fs::write(&target, file.content.as_bytes()).map_err(|e| e.to_string())?;
        }
        written.push(file.path);
    }

    // Files from the last backup that aren't in this one, then the folders
    // they leave empty.
    let keep: HashSet<&str> = written.iter().map(String::as_str).collect();
    for old in previous.iter().filter(|p| !keep.contains(p.as_str())) {
        let Some(rel) = safe_relative(old) else {
            continue;
        };
        let path = base.join(&rel);
        let _ = std::fs::remove_file(&path);
        let mut dir = path.parent();
        while let Some(d) = dir {
            if d == base || std::fs::remove_dir(d).is_err() {
                break; // not empty, or the top
            }
            dir = d.parent();
        }
    }

    let manifest = serde_json::to_string(&written).map_err(|e| e.to_string())?;
    std::fs::write(base.join(MANIFEST), manifest).map_err(|e| e.to_string())?;
    Ok(written.len() as u32)
}

/// Writes the backup into <folder>/<root>/. Resolves with how many files
/// it holds.
#[tauri::command]
pub async fn backup_write(
    folder: String,
    root: String,
    files: Vec<BackupFile>,
) -> Result<u32, String> {
    let Some(root) = safe_relative(&root) else {
        return Err("Invalid folder name".into());
    };
    let base = PathBuf::from(folder).join(root);
    tauri::async_runtime::spawn_blocking(move || write_all(base, files))
        .await
        .map_err(|e| e.to_string())?
}

/// Asks for the folder to back up into. None when the person cancels.
#[tauri::command]
pub async fn backup_pick_folder(app: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .blocking_pick_folder()
            .and_then(|p| p.into_path().ok())
            .map(|p| p.to_string_lossy().into_owned())
    })
    .await
    .map_err(|e| e.to_string())
}

/// Opens a folder in Explorer, Finder or the file manager.
#[tauri::command]
pub fn backup_open_folder(folder: String) -> Result<(), String> {
    tauri_plugin_opener::open_path(folder, None::<&str>).map_err(|e| e.to_string())
}
