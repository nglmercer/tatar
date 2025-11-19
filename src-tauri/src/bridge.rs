use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime};
use tokio::sync::oneshot;
use tokio::sync::Mutex; // Cambiar de std::sync::Mutex
use uuid::Uuid;

#[derive(serde::Serialize, Clone)]
struct RequestPayload {
    request_id: String,
    topic: String,
}
pub struct AppState {
    pub http_server_shutdown: Arc<Mutex<Option<oneshot::Sender<()>>>>,
    pub pending_requests: Arc<Mutex<HashMap<String, oneshot::Sender<Value>>>>,
    pub app_handle: Arc<Mutex<Option<AppHandle>>>,
}

impl Clone for AppState {
    fn clone(&self) -> Self {
        Self {
            http_server_shutdown: Arc::clone(&self.http_server_shutdown),
            pending_requests: Arc::clone(&self.pending_requests),
            app_handle: Arc::clone(&self.app_handle),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            http_server_shutdown: Arc::new(Mutex::new(None)),
            pending_requests: Arc::new(Mutex::new(HashMap::new())),
            app_handle: Arc::new(Mutex::new(None)),
        }
    }
}
impl AppState {
    pub async fn request_live_data(&self, topic: &str, timeout_ms: u64) -> Result<Value, String> {
        let req_id = Uuid::new_v4().to_string();
        let (tx, rx) = oneshot::channel();

        {
            let mut map = self.pending_requests.lock().await; // Cambiar a .await
            map.insert(req_id.clone(), tx);
        }

        let payload = RequestPayload {
            request_id: req_id.clone(),
            topic: topic.to_string(),
        };

        let handle_guard = self.app_handle.lock().await; // Cambiar a .await
        if let Some(handle) = handle_guard.as_ref() {
            if let Err(e) = handle.emit("ytm:request", payload) {
                self.pending_requests.lock().await.remove(&req_id); // Cambiar a .await
                return Err(format!("Error emitiendo evento: {}", e));
            }
        } else {
            return Err("AppHandle no inicializado".to_string());
        }
        drop(handle_guard);

        match tokio::time::timeout(Duration::from_millis(timeout_ms), rx).await {
            Ok(result) => match result {
                Ok(json_value) => Ok(json_value),
                Err(_) => Err("Channel closed unexpectedly".to_string()),
            },
            Err(_) => {
                self.pending_requests.lock().await.remove(&req_id); // Cambiar a .await
                Err("Timeout waiting for frontend response".to_string())
            }
        }
    }

    pub async fn emit_to_frontend(&self, event: &str, payload: Value) {
        // Hacer async
        let handle_guard = self.app_handle.lock().await; // Cambiar a .await
        if let Some(handle) = handle_guard.as_ref() {
            if let Err(e) = handle.emit(event, payload) {
                eprintln!("❌ Error emit_to_frontend {}: {}", event, e);
            }
        }
    }
}

// ... Resto de funciones (resolve_request, push_telemetry) igual que antes ...
#[tauri::command]
pub async fn resolve_request(
    state: tauri::State<'_, Arc<AppState>>,
    request_id: String,
    data: Value,
) -> Result<(), String> {
    //println!("sender_opt: {:?}", request_id);
    let sender_opt = {
        // USE .await HERE
        let mut map = state.pending_requests.lock().await;
        map.remove(&request_id)
    };
    if let Some(sender) = sender_opt {
        let _ = sender.send(data);
    }
    Ok(())
}

#[tauri::command]
pub fn push_telemetry<R: Runtime>(
    app: AppHandle<R>,
    _state: tauri::State<'_, Arc<AppState>>,
    topic: String,
    payload: Value,
) {
    let event_name = format!("ytm:{}", topic);
    let _ = app.emit(&event_name, payload);
}
