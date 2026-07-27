use axum::Json;
use serde::Serialize;
use std::collections::HashSet;

#[derive(Clone)]
struct SampleEvent {
    timestamp: &'static str,
    session_id: &'static str,
}

fn sample_events() -> Vec<SampleEvent> {
    vec![
        SampleEvent {
            timestamp: "2024-01-15T10:00:00Z",
            session_id: "sess-1",
        },
        SampleEvent {
            timestamp: "2024-01-15T10:05:00Z",
            session_id: "sess-1",
        },
        SampleEvent {
            timestamp: "2024-01-15T14:32:00Z",
            session_id: "sess-2",
        },
    ]
}

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub event_count: usize,
    pub oldest_event: Option<String>,
    pub newest_event: Option<String>,
}

pub async fn analytics_health() -> Json<HealthResponse> {
    let events = sample_events();
    Json(HealthResponse {
        status: "ok".to_string(),
        event_count: events.len(),
        oldest_event: events.first().map(|e| e.timestamp.to_string()),
        newest_event: events.last().map(|e| e.timestamp.to_string()),
    })
}

#[derive(Serialize)]
pub struct SessionsResponse {
    pub unique_sessions: usize,
}

pub async fn analytics_sessions() -> Json<SessionsResponse> {
    let unique: HashSet<&str> = sample_events().iter().map(|e| e.session_id).collect();
    Json(SessionsResponse {
        unique_sessions: unique.len(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn health_reports_event_count_and_bounds() {
        let Json(response) = analytics_health().await;
        assert_eq!(response.event_count, 3);
        assert_eq!(
            response.oldest_event.as_deref(),
            Some("2024-01-15T10:00:00Z")
        );
        assert_eq!(
            response.newest_event.as_deref(),
            Some("2024-01-15T14:32:00Z")
        );
    }

    #[tokio::test]
    async fn sessions_counts_unique_session_ids() {
        let Json(response) = analytics_sessions().await;
        assert_eq!(response.unique_sessions, 2);
    }
}
