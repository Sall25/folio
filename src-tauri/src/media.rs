// Media saved on this computer: images, videos, audio and files from pages,
// downloaded here so they show and play without a connection
// (src/lib/media-cache.ts is the web app's side).
//
// Each file sits in the app's data folder, under media/:
//   <sha256 of its address>.<extension>   the file
//   <sha256 of its address>.url           its address, to list what's saved
// A download goes to a .part file first and is renamed when complete, so a
// half-downloaded file is never served.
//
// The page shows a saved file through Tauri's asset protocol
// (convertFileSrc, scoped to this folder in tauri.conf.json), which answers
// range requests: a saved video can be skipped through.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncWriteExt;

const DIR: &str = "media";
const PROGRESS_EVERY: Duration = Duration::from_millis(250);

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MediaEntry {
    url: String,
    path: String,
    size: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct MediaProgress {
    url: String,
    received: u64,
    total: Option<u64>,
}

fn media_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join(DIR);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn key_of(url: &str) -> String {
    let digest = Sha256::digest(url.as_bytes());
    digest.iter().map(|b| format!("{b:02x}")).collect()
}

/// The extension from the address's path ("clip.mp4?token=…" → "mp4"), or
/// "bin". Kept so the asset protocol sends the right content type.
fn extension_of(url: &str) -> String {
    let path = url.split(['?', '#']).next().unwrap_or("");
    let name = path.rsplit('/').next().unwrap_or("");
    match name.rsplit_once('.') {
        Some((_, ext))
            if !ext.is_empty()
                && ext.len() <= 8
                && ext.chars().all(|c| c.is_ascii_alphanumeric()) =>
        {
            ext.to_ascii_lowercase()
        }
        _ => "bin".into(),
    }
}

/// The saved file for this address, if there is one.
fn find_file(dir: &Path, key: &str) -> Option<PathBuf> {
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        let stem = path.file_stem().and_then(|s| s.to_str());
        let ext = path.extension().and_then(|s| s.to_str());
        if stem == Some(key) && !matches!(ext, Some("url") | Some("part")) {
            return Some(path);
        }
    }
    None
}

fn entry_for(url: String, path: &Path) -> Result<MediaEntry, String> {
    let size = std::fs::metadata(path).map_err(|e| e.to_string())?.len();
    Ok(MediaEntry {
        url,
        path: path.to_string_lossy().into_owned(),
        size,
    })
}

fn client() -> Result<reqwest::Client, String> {
    // The same TLS setup as the updater: rustls, with ring as its crypto.
    if rustls::crypto::CryptoProvider::get_default().is_none() {
        let _ = rustls::crypto::ring::default_provider().install_default();
    }
    reqwest::Client::builder()
        .user_agent("Folio desktop")
        .connect_timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())
}

/// Downloads `url` to this computer (or returns the copy already saved).
/// Sends "media-progress" events while it downloads.
#[tauri::command]
pub async fn media_save(app: AppHandle, url: String) -> Result<MediaEntry, String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("Only web addresses can be saved".into());
    }
    let dir = media_dir(&app)?;
    let key = key_of(&url);
    if let Some(existing) = find_file(&dir, &key) {
        // Its address too, in case the app closed before writing it.
        let _ = std::fs::write(dir.join(format!("{key}.url")), url.as_bytes());
        return entry_for(url, &existing);
    }

    let response = client()?
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("The server answered {}", response.status()));
    }
    let total = response.content_length();

    let target = dir.join(format!("{key}.{}", extension_of(&url)));
    let part = dir.join(format!("{key}.part"));
    let mut file = tokio::fs::File::create(&part)
        .await
        .map_err(|e| e.to_string())?;

    let mut received: u64 = 0;
    let mut last_sent = Instant::now();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => {
                drop(file);
                let _ = tokio::fs::remove_file(&part).await;
                return Err(e.to_string());
            }
        };
        if let Err(e) = file.write_all(&chunk).await {
            drop(file);
            let _ = tokio::fs::remove_file(&part).await;
            return Err(e.to_string());
        }
        received += chunk.len() as u64;
        if last_sent.elapsed() >= PROGRESS_EVERY {
            last_sent = Instant::now();
            let _ = app.emit(
                "media-progress",
                MediaProgress {
                    url: url.clone(),
                    received,
                    total,
                },
            );
        }
    }
    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    tokio::fs::rename(&part, &target)
        .await
        .map_err(|e| e.to_string())?;
    tokio::fs::write(dir.join(format!("{key}.url")), url.as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    entry_for(url, &target)
}

/// Everything saved on this computer.
#[tauri::command]
pub fn media_list(app: AppHandle) -> Result<Vec<MediaEntry>, String> {
    let dir = media_dir(&app)?;
    // One pass over the folder: each key's address and its file.
    let mut urls: HashMap<String, PathBuf> = HashMap::new();
    let mut files: HashMap<String, PathBuf> = HashMap::new();
    for entry in std::fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .flatten()
    {
        let path = entry.path();
        let Some(key) = path.file_stem().and_then(|s| s.to_str()).map(String::from) else {
            continue;
        };
        match path.extension().and_then(|s| s.to_str()) {
            Some("url") => {
                urls.insert(key, path);
            }
            Some("part") => {}
            _ => {
                files.insert(key, path);
            }
        }
    }
    let mut out = Vec::new();
    for (key, url_path) in urls {
        let (Some(file), Ok(url)) = (files.get(&key), std::fs::read_to_string(&url_path)) else {
            continue;
        };
        if let Ok(item) = entry_for(url, file) {
            out.push(item);
        }
    }
    Ok(out)
}

/// Removes the copy of `url`, if there is one.
#[tauri::command]
pub fn media_remove(app: AppHandle, url: String) -> Result<(), String> {
    let dir = media_dir(&app)?;
    let key = key_of(&url);
    if let Some(file) = find_file(&dir, &key) {
        let _ = std::fs::remove_file(file);
    }
    let _ = std::fs::remove_file(dir.join(format!("{key}.url")));
    Ok(())
}

/// Removes every saved file.
#[tauri::command]
pub fn media_clear(app: AppHandle) -> Result<(), String> {
    let dir = media_dir(&app)?;
    std::fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(())
}

/// Opens the saved copy of `url` in the computer's app for that kind of file.
#[tauri::command]
pub fn media_open(app: AppHandle, url: String) -> Result<(), String> {
    let dir = media_dir(&app)?;
    let file = find_file(&dir, &key_of(&url)).ok_or("Not saved on this computer")?;
    tauri_plugin_opener::open_path(file, None::<&str>).map_err(|e| e.to_string())
}

/// Opens the media folder in Explorer, Finder or the file manager.
#[tauri::command]
pub fn media_open_folder(app: AppHandle) -> Result<(), String> {
    let dir = media_dir(&app)?;
    tauri_plugin_opener::open_path(dir, None::<&str>).map_err(|e| e.to_string())
}
