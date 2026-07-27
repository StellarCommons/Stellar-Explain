//! Analytics routes — event ingestion and aggregation summary.
//!
//! ## Endpoints
//! - `POST /analytics/events`  — ingest a single analytics event
//! - `GET  /analytics/summary` — return event counts grouped by name
//!
//! The event store is a simple in-memory append-only list protected by an
//! `Arc<Mutex<Vec<StoredEvent>>>`.  It is intentionally lightweight: data
//! is lost on restart, making this suitable for development metrics and
//! short-lived aggregation windows.

use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use time::{Duration, OffsetDateTime, format_description::well_known::Rfc3339};
use tracing::{error, info};

// ─────────────────────────────────────────────────────────────────────────────
// Shared state
// ─────────────────────────────────────────────────────────────────────────────

/// A single analytics event stored in memory.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredEvent {
    pub id: String,
    pub name: String,
    pub timestamp: String, // RFC 3339 / ISO 8601
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub properties: Option<serde_json::Value>,
}

/// Thread-safe in-memory analytics event store.
pub type AnalyticsStore = Arc<Mutex<Vec<StoredEvent>>>;

/// Create a new, empty analytics store.
pub fn new_store() -> AnalyticsStore {
    Arc::new(Mutex::new(Vec::new()))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /analytics/events
// ─────────────────────────────────────────────────────────────────────────────

/// Request body for ingesting a new analytics event.
#[derive(Debug, Deserialize)]
pub struct IngestEventRequest {
    pub id: String,
    pub name: String,
    pub timestamp: String,
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub properties: Option<serde_json::Value>,
}

/// Response returned after successfully ingesting an event.
#[derive(Debug, Serialize)]
pub struct IngestEventResponse {
    pub ok: bool,
}

/// `POST /analytics/events` — append one event to the in-memory store.
pub async fn ingest_event(
    State(store): State<AnalyticsStore>,
    Json(body): Json<IngestEventRequest>,
) -> Result<(StatusCode, Json<IngestEventResponse>), (StatusCode, Json<serde_json::Value>)> {
    // Validate that the timestamp parses as RFC 3339.
    if OffsetDateTime::parse(&body.timestamp, &Rfc3339).is_err() {
        let err = serde_json::json!({
            "error": {
                "code": "BAD_REQUEST",
                "message": "timestamp must be a valid ISO 8601 / RFC 3339 datetime"
            }
        });
        return Err((StatusCode::BAD_REQUEST, Json(err)));
    }

    let event = StoredEvent {
        id: body.id.clone(),
        name: body.name.clone(),
        timestamp: body.timestamp.clone(),
        user_id: body.user_id,
        session_id: body.session_id,
        properties: body.properties,
    };

    match store.lock() {
        Ok(mut guard) => {
            guard.push(event);
            info!(event_id = %body.id, event_name = %body.name, "analytics_event_ingested");
        }
        Err(e) => {
            error!(err = %e, "analytics_store_lock_poisoned");
            let err = serde_json::json!({
                "error": { "code": "INTERNAL_ERROR", "message": "event store unavailable" }
            });
            return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(err)));
        }
    }

    Ok((StatusCode::CREATED, Json(IngestEventResponse { ok: true })))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /analytics/summary
// ─────────────────────────────────────────────────────────────────────────────

/// Query parameters for `GET /analytics/summary`.
#[derive(Debug, Deserialize)]
pub struct SummaryQuery {
    /// ISO 8601 start of the window (default: 24 hours ago).
    pub from: Option<String>,
    /// ISO 8601 end of the window (default: now).
    pub to: Option<String>,
}

/// One row in the summary — an event name and how many times it fired.
#[derive(Debug, Serialize, PartialEq)]
pub struct EventCount {
    pub name: String,
    pub count: u64,
}

/// Response body for `GET /analytics/summary`.
#[derive(Debug, Serialize)]
pub struct SummaryResponse {
    /// ISO 8601 start of the queried window.
    pub from: String,
    /// ISO 8601 end of the queried window.
    pub to: String,
    /// Event counts sorted by name.
    pub events: Vec<EventCount>,
    /// Total events in the window.
    pub total: u64,
}

/// `GET /analytics/summary` — return event counts grouped by name for the
/// requested time window.
pub async fn get_summary(
    State(store): State<AnalyticsStore>,
    Query(params): Query<SummaryQuery>,
) -> Result<Json<SummaryResponse>, (StatusCode, Json<serde_json::Value>)> {
    let now = OffsetDateTime::now_utc();
    let default_from = now - Duration::hours(24);

    // Parse `from`
    let from_dt = match &params.from {
        Some(s) => match OffsetDateTime::parse(s, &Rfc3339) {
            Ok(dt) => dt,
            Err(_) => {
                let err = serde_json::json!({
                    "error": {
                        "code": "BAD_REQUEST",
                        "message": "`from` must be a valid ISO 8601 datetime"
                    }
                });
                return Err((StatusCode::BAD_REQUEST, Json(err)));
            }
        },
        None => default_from,
    };

    // Parse `to`
    let to_dt = match &params.to {
        Some(s) => match OffsetDateTime::parse(s, &Rfc3339) {
            Ok(dt) => dt,
            Err(_) => {
                let err = serde_json::json!({
                    "error": {
                        "code": "BAD_REQUEST",
                        "message": "`to` must be a valid ISO 8601 datetime"
                    }
                });
                return Err((StatusCode::BAD_REQUEST, Json(err)));
            }
        },
        None => now,
    };

    if from_dt >= to_dt {
        let err = serde_json::json!({
            "error": {
                "code": "BAD_REQUEST",
                "message": "`from` must be before `to`"
            }
        });
        return Err((StatusCode::BAD_REQUEST, Json(err)));
    }

    // Aggregate
    let counts: HashMap<String, u64> = match store.lock() {
        Ok(guard) => {
            let mut map: HashMap<String, u64> = HashMap::new();
            for event in guard.iter() {
                if let Ok(ts) = OffsetDateTime::parse(&event.timestamp, &Rfc3339) {
                    if ts >= from_dt && ts <= to_dt {
                        *map.entry(event.name.clone()).or_insert(0) += 1;
                    }
                }
            }
            map
        }
        Err(e) => {
            error!(err = %e, "analytics_store_lock_poisoned");
            let err = serde_json::json!({
                "error": { "code": "INTERNAL_ERROR", "message": "event store unavailable" }
            });
            return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(err)));
        }
    };

    let total: u64 = counts.values().sum();

    let mut events: Vec<EventCount> = counts
        .into_iter()
        .map(|(name, count)| EventCount { name, count })
        .collect();
    events.sort_by(|a, b| a.name.cmp(&b.name));

    let from_str = from_dt.format(&Rfc3339).unwrap_or_default();
    let to_str = to_dt.format(&Rfc3339).unwrap_or_default();

    info!(
        from = %from_str,
        to = %to_str,
        total,
        "analytics_summary_served"
    );

    Ok(Json(SummaryResponse {
        from: from_str,
        to: to_str,
        events,
        total,
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn ts(offset_hours: i64) -> String {
        let dt = OffsetDateTime::now_utc() + Duration::hours(offset_hours);
        dt.format(&Rfc3339).unwrap()
    }

    fn insert(store: &AnalyticsStore, name: &str, timestamp: &str) {
        store.lock().unwrap().push(StoredEvent {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.to_string(),
            timestamp: timestamp.to_string(),
            user_id: None,
            session_id: None,
            properties: None,
        });
    }

    #[test]
    fn empty_store_returns_zero_total() {
        let store = new_store();
        let now = OffsetDateTime::now_utc();
        let from = (now - Duration::hours(1)).format(&Rfc3339).unwrap();
        let to = now.format(&Rfc3339).unwrap();

        let counts = {
            let guard = store.lock().unwrap();
            let from_dt = OffsetDateTime::parse(&from, &Rfc3339).unwrap();
            let to_dt = OffsetDateTime::parse(&to, &Rfc3339).unwrap();
            let mut map: HashMap<String, u64> = HashMap::new();
            for event in guard.iter() {
                if let Ok(ts) = OffsetDateTime::parse(&event.timestamp, &Rfc3339) {
                    if ts >= from_dt && ts <= to_dt {
                        *map.entry(event.name.clone()).or_insert(0) += 1;
                    }
                }
            }
            map
        };

        assert_eq!(counts.values().sum::<u64>(), 0);
    }

    #[test]
    fn counts_events_within_window() {
        let store = new_store();

        // 3 events in window, 1 outside
        insert(&store, "page_view", &ts(-1));
        insert(&store, "page_view", &ts(-2));
        insert(&store, "button_click", &ts(-3));
        insert(&store, "page_view", &ts(-30)); // outside 24h window

        let from_dt = OffsetDateTime::now_utc() - Duration::hours(24);
        let to_dt = OffsetDateTime::now_utc();

        let counts = {
            let guard = store.lock().unwrap();
            let mut map: HashMap<String, u64> = HashMap::new();
            for event in guard.iter() {
                if let Ok(event_ts) = OffsetDateTime::parse(&event.timestamp, &Rfc3339) {
                    if event_ts >= from_dt && event_ts <= to_dt {
                        *map.entry(event.name.clone()).or_insert(0) += 1;
                    }
                }
            }
            map
        };

        assert_eq!(counts["page_view"], 2);
        assert_eq!(counts["button_click"], 1);
        assert_eq!(counts.values().sum::<u64>(), 3);
    }

    #[test]
    fn events_outside_window_excluded() {
        let store = new_store();

        // All events are older than 24 h
        insert(&store, "login", &ts(-25));
        insert(&store, "logout", &ts(-26));

        let from_dt = OffsetDateTime::now_utc() - Duration::hours(24);
        let to_dt = OffsetDateTime::now_utc();

        let counts = {
            let guard = store.lock().unwrap();
            let mut map: HashMap<String, u64> = HashMap::new();
            for event in guard.iter() {
                if let Ok(event_ts) = OffsetDateTime::parse(&event.timestamp, &Rfc3339) {
                    if event_ts >= from_dt && event_ts <= to_dt {
                        *map.entry(event.name.clone()).or_insert(0) += 1;
                    }
                }
            }
            map
        };

        assert_eq!(counts.values().sum::<u64>(), 0);
    }

    #[test]
    fn summary_events_are_sorted_by_name() {
        let mut events = vec![
            EventCount { name: "page_view".to_string(), count: 5 },
            EventCount { name: "api_call".to_string(), count: 2 },
            EventCount { name: "button_click".to_string(), count: 3 },
        ];
        events.sort_by(|a, b| a.name.cmp(&b.name));

        assert_eq!(events[0].name, "api_call");
        assert_eq!(events[1].name, "button_click");
        assert_eq!(events[2].name, "page_view");
    }
}
