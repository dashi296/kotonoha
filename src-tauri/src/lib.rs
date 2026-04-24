use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

struct OllamaProcess(Mutex<Option<Child>>);

fn is_ollama_installed() -> bool {
    Command::new("ollama")
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok()
}

fn is_ollama_running() -> bool {
    TcpStream::connect("127.0.0.1:11434").is_ok()
}

#[tauri::command]
fn get_ollama_status() -> &'static str {
    if !is_ollama_installed() {
        return "not_installed";
    }
    if is_ollama_running() {
        "running"
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
        .setup(|app| {
            let child = if is_ollama_installed() && !is_ollama_running() {
                Command::new("ollama")
                    .arg("serve")
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn()
                    .ok()
            } else {
                None
            };
            app.manage(OllamaProcess(Mutex::new(child)));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Ok(mut guard) = window.state::<OllamaProcess>().0.lock() {
                    if let Some(ref mut child) = *guard {
                        let _ = child.kill();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![get_ollama_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
