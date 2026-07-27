use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use crate::analytics::store::{AnalyticsEvent, EventStore};
use crate::errors::AppError;

#[derive(Debug, Deserialize)]
pub struct IngestRequest {
    pub events: Vec<AnalyticsEvent>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IngestResponse {
    pub accepted: usize,
    pub dropped: usize,
    pub message: String,
}

#[derive(Debug)]
pub struct AnalyticsState {
    pub store: Mutex<EventStore>,
    pub max_batch_size: usize,
    pub rate_limit_window: Duration,
    pub last_request: Mutex<Option<Instant>>,
}

impl AnalyticsState {
    pub fn new(max_capacity: usize, max_batch_size: usize, rate_limit_secs: u64) -> Self {
        Self {
            store: Mutex::new(EventStore::new(max_capacity)),
            max_batch_size,
            rate_limit_window: Duration::from_secs(rate_limit_secs),
            last_request: Mutex::new(None),
        }
    }
}

pub async fn ingest(
    State(state): State<Arc<AnalyticsState>>,
    Json(payload): Json<IngestRequest>,
) -> Result<Json<IngestResponse>, AppError> {
    if payload.events.is_empty() {
        return Err(AppError::BadRequest("Events list is empty.".into()));
    }

    if payload.events.len() > state.max_batch_size {
        return Err(AppError::BadRequest(format!(
            "Batch size {} exceeds maximum of {}.",
            payload.events.len(),
            state.max_batch_size
        )));
    }

    {
        let mut last = state.last_request.lock().map_err(|_| {
            AppError::Internal("Rate limiter lock poisoned.".into())
        })?;

        if let Some(prev) = *last {
            if prev.elapsed() < state.rate_limit_window {
                return Err(AppError::BadRequest(
                    "Rate limit exceeded. Please try again later.".into(),
                ));
            }
        }
        *last = Some(Instant::now());
    }

    let mut dropped = 0usize;
    let mut accepted = 0usize;

    let mut store = state.store.lock().map_err(|_| {
        AppError::Internal("Event store lock poisoned.".into())
    })?;

    for event in payload.events {
        if event.id.is_empty() || event.name.is_empty() {
            dropped += 1;
            continue;
        }
        store.insert(event);
        accepted += 1;
    }

    Ok(Json(IngestResponse {
        accepted,
        dropped,
        message: format!("Accepted {accepted} event(s), dropped {dropped} invalid event(s)."),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use axum::routing::post;
    use axum::Router;

    fn test_state() -> Arc<AnalyticsState> {
        Arc::new(AnalyticsState::new(1000, 100, 0))
    }

    fn test_state_with_rate_limit() -> Arc<AnalyticsState> {
        Arc::new(AnalyticsState::new(1000, 100, 5))
    }

    fn test_router(state: Arc<AnalyticsState>) -> Router {
        Router::new()
            .route("/analytics/ingest", post(ingest))
            .with_state(state)
    }

    fn make_event_json(id: &str, name: &str, ts: u64) -> serde_json::Value {
        serde_json::json!({
            "id": id,
            "name": name,
            "timestamp": ts
        })
    }

    #[test]
    fn test_handler_valid_batch() {
        let state = test_state();
        let payload = IngestRequest {
            events: vec![
                AnalyticsEvent {
                    id: "1".into(),
                    name: "page_view".into(),
                    timestamp: 1000,
                    properties: None,
                    user_id: None,
                    session_id: None,
                },
                AnalyticsEvent {
                    id: "2".into(),
                    name: "button_click".into(),
                    timestamp: 2000,
                    properties: None,
                    user_id: None,
                    session_id: None,
                },
            ],
        };

        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(ingest(State(state), Json(payload)));
        assert!(result.is_ok());

        let resp = result.unwrap().0;
        assert_eq!(resp.accepted, 2);
        assert_eq!(resp.dropped, 0);
    }

    #[test]
    fn test_handler_empty_batch() {
        let state = test_state();
        let payload = IngestRequest { events: vec![] };

        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(ingest(State(state), Json(payload)));
        assert!(result.is_err());
    }

    #[test]
    fn test_handler_invalid_events_dropped() {
        let state = test_state();
        let payload = IngestRequest {
            events: vec![
                AnalyticsEvent {
                    id: "1".into(),
                    name: "page_view".into(),
                    timestamp: 1000,
                    properties: None,
                    user_id: None,
                    session_id: None,
                },
                AnalyticsEvent {
                    id: "".into(),
                    name: "empty_id".into(),
                    timestamp: 2000,
                    properties: None,
                    user_id: None,
                    session_id: None,
                },
                AnalyticsEvent {
                    id: "3".into(),
                    name: "".into(),
                    timestamp: 3000,
                    properties: None,
                    user_id: None,
                    session_id: None,
                },
            ],
        };

        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(ingest(State(state), Json(payload)));
        assert!(result.is_ok());

        let resp = result.unwrap().0;
        assert_eq!(resp.accepted, 1);
        assert_eq!(resp.dropped, 2);
    }

    #[test]
    fn test_handler_batch_exceeds_max_size() {
        let state = Arc::new(AnalyticsState::new(1000, 2, 0));
        let payload = IngestRequest {
            events: vec![
                AnalyticsEvent { id: "1".into(), name: "a".into(), timestamp: 100, properties: None, user_id: None, session_id: None },
                AnalyticsEvent { id: "2".into(), name: "b".into(), timestamp: 200, properties: None, user_id: None, session_id: None },
                AnalyticsEvent { id: "3".into(), name: "c".into(), timestamp: 300, properties: None, user_id: None, session_id: None },
            ],
        };

        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(ingest(State(state), Json(payload)));
        assert!(result.is_err());
    }

    #[test]
    fn test_handler_rate_limit() {
        let state = test_state_with_rate_limit();
        let payload = IngestRequest {
            events: vec![
                AnalyticsEvent { id: "1".into(), name: "page_view".into(), timestamp: 1000, properties: None, user_id: None, session_id: None },
            ],
        };

        let rt = tokio::runtime::Runtime::new().unwrap();

        let result1 = rt.block_on(ingest(State(Arc::clone(&state)), Json(IngestRequest {
            events: payload.events.clone(),
        })));
        assert!(result1.is_ok());

        let result2 = rt.block_on(ingest(State(state), Json(payload)));
        assert!(result2.is_err());
    }

    #[test]
    fn test_store_affected_by_handler() {
        let state = test_state();
        let payload = IngestRequest {
            events: vec![
                AnalyticsEvent { id: "1".into(), name: "page_view".into(), timestamp: 1000, properties: None, user_id: None, session_id: None },
            ],
        };

        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(ingest(State(Arc::clone(&state)), Json(payload))).unwrap();

        let store = state.store.lock().unwrap();
        assert_eq!(store.len(), 1);
    }
}
