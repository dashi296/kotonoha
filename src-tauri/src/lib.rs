mod commands;

use commands::model_management::{cancel_pull, delete_model, list_models, start_pull, PullState};
use std::net::TcpStream;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{Manager, State};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct OllamaProcess(Mutex<Option<CommandChild>>);
struct SidecarFailed(AtomicBool);

fn is_ollama_running() -> bool {
    TcpStream::connect("127.0.0.1:11434").is_ok()
}

#[tauri::command]
fn get_ollama_status(failed: State<'_, SidecarFailed>) -> &'static str {
    if is_ollama_running() {
        "running"
    } else if failed.0.load(Ordering::Acquire) {
        "not_installed"
    } else {
        "starting"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let sidecar_failed = SidecarFailed(AtomicBool::new(false));
            let child = if !is_ollama_running() {
                match app.handle().shell().sidecar("ollama") {
                    Ok(cmd) => match cmd.args(["serve"]).spawn() {
                        Ok((_, child)) => Some(child),
                        Err(e) => {
                            eprintln!("Failed to start Ollama sidecar: {e}");
                            sidecar_failed.0.store(true, Ordering::Release);
                            None
                        }
                    },
                    Err(e) => {
                        eprintln!("Ollama sidecar not found: {e}");
                        sidecar_failed.0.store(true, Ordering::Release);
                        None
                    }
                }
            } else {
                None
            };
            app.manage(sidecar_failed);
            app.manage(OllamaProcess(Mutex::new(child)));
            app.manage(PullState::new());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Ok(mut guard) = window.state::<OllamaProcess>().0.lock() {
                    if let Some(child) = guard.take() {
                        let _ = child.kill();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_ollama_status,
            list_models,
            start_pull,
            cancel_pull,
            delete_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
