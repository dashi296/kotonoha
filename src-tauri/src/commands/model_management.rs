use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

fn map_request_err(e: reqwest::Error) -> String {
    if e.is_connect() {
        "Ollama に接続できません。アプリを再起動してください。".to_string()
    } else {
        e.to_string()
    }
}

pub struct PullState {
    pub client: Client,
    pub cancel_flag: AtomicBool,
    pub tracked_digests: Mutex<Vec<String>>,
}

impl PullState {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            cancel_flag: AtomicBool::new(false),
            tracked_digests: Mutex::new(Vec::new()),
        }
    }
}

#[derive(Deserialize)]
struct OllamaModelRaw {
    name: String,
    size: u64,
    modified_at: String,
    digest: String,
}

#[derive(Serialize, Clone)]
pub struct ModelInfo {
    pub name: String,
    pub size: u64,
    pub modified_at: String,
    pub digest: String,
}

#[derive(Deserialize)]
struct ListResponse {
    models: Vec<OllamaModelRaw>,
}

#[derive(Deserialize)]
struct PullProgressRaw {
    status: String,
    digest: Option<String>,
    completed: Option<u64>,
    total: Option<u64>,
}

#[derive(Serialize, Clone)]
struct PullProgress {
    status: String,
    digest: Option<String>,
    completed: Option<u64>,
    total: Option<u64>,
}

#[tauri::command]
pub async fn list_models(state: State<'_, PullState>) -> Result<Vec<ModelInfo>, String> {
    let client = state.client.clone();
    let response = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(map_request_err)?;

    if !response.status().is_success() {
        return Err(format!("Ollama API error: {}", response.status()));
    }

    let data = response
        .json::<ListResponse>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(data
        .models
        .into_iter()
        .map(|m| ModelInfo {
            name: m.name,
            size: m.size,
            modified_at: m.modified_at,
            digest: m.digest,
        })
        .collect())
}

#[tauri::command]
pub async fn start_pull(
    app: AppHandle,
    model: String,
    state: State<'_, PullState>,
) -> Result<(), String> {
    state.cancel_flag.store(false, Ordering::Release);
    {
        let mut digests = state.tracked_digests.lock().map_err(|e| e.to_string())?;
        digests.clear();
    }

    let client = state.client.clone();
    let response = client
        .post("http://localhost:11434/api/pull")
        .json(&serde_json::json!({ "model": model, "stream": true }))
        .send()
        .await
        .map_err(map_request_err)?;

    if !response.status().is_success() {
        return Err(format!("Ollama API error: {}", response.status()));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        if state.cancel_flag.load(Ordering::Acquire) {
            break;
        }
        match chunk {
            Err(e) => return Err(e.to_string()),
            Ok(bytes) => {
                buffer.push_str(&String::from_utf8_lossy(&bytes));
                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].to_string();
                    buffer = buffer[pos + 1..].to_string();
                    if line.is_empty() {
                        continue;
                    }
                    if let Ok(p) = serde_json::from_str::<PullProgressRaw>(&line) {
                        if let Some(ref digest) = p.digest {
                            let mut digests =
                                state.tracked_digests.lock().map_err(|e| e.to_string())?;
                            if !digests.contains(digest) {
                                digests.push(digest.clone());
                            }
                        }
                        let _ = app.emit(
                            "pull_progress",
                            PullProgress {
                                status: p.status.clone(),
                                digest: p.digest,
                                completed: p.completed,
                                total: p.total,
                            },
                        );
                        if p.status == "success" {
                            return Ok(());
                        }
                    }
                }
            }
        }
    }

    if state.cancel_flag.load(Ordering::Acquire) {
        Ok(())
    } else {
        Err("ダウンロードが中断されました。再度お試しください。".to_string())
    }
}

#[tauri::command]
pub async fn cancel_pull(state: State<'_, PullState>) -> Result<(), String> {
    state.cancel_flag.store(true, Ordering::Release);

    // Note: a digest added by start_pull between the snapshot and the clear below
    // will be removed from the list without being deleted. This is a minor race
    // (the blob was only just starting) and is acceptable.
    let digests = {
        let guard = state.tracked_digests.lock().map_err(|e| e.to_string())?;
        guard.clone()
    };

    let client = state.client.clone();
    for digest in &digests {
        let _ = client
            .delete(&format!("http://localhost:11434/api/blobs/{}", digest))
            .send()
            .await;
    }

    state
        .tracked_digests
        .lock()
        .map_err(|e| e.to_string())?
        .clear();

    Ok(())
}

#[tauri::command]
pub async fn delete_model(model: String, state: State<'_, PullState>) -> Result<(), String> {
    let client = state.client.clone();
    let response = client
        .delete("http://localhost:11434/api/delete")
        .json(&serde_json::json!({ "model": model }))
        .send()
        .await
        .map_err(map_request_err)?;

    if !response.status().is_success() {
        return Err(format!("Failed to delete model: {}", response.status()));
    }

    Ok(())
}
