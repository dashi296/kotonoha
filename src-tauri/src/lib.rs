mod commands;

use commands::model_management::{cancel_pull, delete_model, list_models, start_pull, PullState};
use std::net::TcpStream;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

struct OllamaProcess(Mutex<Option<CommandChild>>);
struct SidecarFailed(Arc<AtomicBool>);
struct SidecarShuttingDown(Arc<AtomicBool>);

fn is_ollama_running() -> bool {
    TcpStream::connect("127.0.0.1:11434").is_ok()
}

#[tauri::command]
fn get_ollama_status(
    failed: State<'_, SidecarFailed>,
    process: State<'_, OllamaProcess>,
) -> &'static str {
    if is_ollama_running() {
        "running"
    } else if failed.0.load(Ordering::Acquire) {
        "not_installed"
    } else if process.0.lock().map_or(true, |g| g.is_none()) {
        // No sidecar was started (app launched while external Ollama was running).
        // Treat port-closed as unavailable rather than "starting".
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
            let failed_flag = Arc::new(AtomicBool::new(false));
            let shutting_down_flag = Arc::new(AtomicBool::new(false));
            let sidecar_failed = SidecarFailed(failed_flag.clone());
            let sidecar_shutting_down = SidecarShuttingDown(shutting_down_flag.clone());
            let child = if !is_ollama_running() {
                match app.handle().shell().sidecar("ollama") {
                    Ok(cmd) => match cmd.args(["serve"]).spawn() {
                        Ok((mut receiver, child)) => {
                            let flag = failed_flag.clone();
                            let sd = shutting_down_flag.clone();
                            tauri::async_runtime::spawn(async move {
                                while let Some(event) = receiver.recv().await {
                                    if let CommandEvent::Terminated(_) = event {
                                        if !sd.load(Ordering::Acquire) && !is_ollama_running() {
                                            flag.store(true, Ordering::Release);
                                        }
                                        break;
                                    }
                                }
                            });
                            Some(child)
                        }
                        Err(e) => {
                            eprintln!("Failed to start Ollama sidecar: {e}");
                            failed_flag.store(true, Ordering::Release);
                            None
                        }
                    },
                    Err(e) => {
                        eprintln!("Ollama sidecar not found: {e}");
                        failed_flag.store(true, Ordering::Release);
                        None
                    }
                }
            } else {
                None
            };
            app.manage(sidecar_failed);
            app.manage(sidecar_shutting_down);
            app.manage(OllamaProcess(Mutex::new(child)));
            app.manage(PullState::new());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                window
                    .state::<SidecarShuttingDown>()
                    .0
                    .store(true, Ordering::Release);
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
