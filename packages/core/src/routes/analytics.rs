use axum::{Json, extract::Query};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone)]
struct SampleEvent {
    status_code: Option<u16>,
    tx_hash: Option<&'static str>,
}

fn sample_events() -> Vec<SampleEvent> {
    vec![
        SampleEvent {
            status_code: Some(500),
            tx_hash: None,
        },
        SampleEvent {
            status_code: Some(500),
            tx_hash: None,
        },
        SampleEvent {
            status_code: Some(400),
            tx_hash: None,
        },
        SampleEvent {
            status_code: None,
            tx_hash: Some("abc123"),
        },
        SampleEvent {
            status_code: None,
            tx_hash: Some("abc123"),
        },
        SampleEvent {
            status_code: None,
            tx_hash: Some("def456"),
        },
    ]
}

#[derive(Serialize)]
pub struct ErrorsResponse {
    pub breakdown: HashMap<String, usize>,
}

pub async fn analytics_errors() -> Json<ErrorsResponse> {
    let mut breakdown = HashMap::new();
    for event in sample_events() {
        if let Some(code) = event.status_code {
            *breakdown.entry(code.to_string()).or_insert(0) += 1;
        }
    }
    Json(ErrorsResponse { breakdown })
}

#[derive(Deserialize)]
pub struct TopHashesQuery {
    limit: Option<usize>,
}

#[derive(Serialize)]
pub struct TopHashesResponse {
    pub hashes: Vec<(String, usize)>,
}

pub async fn analytics_top_hashes(Query(query): Query<TopHashesQuery>) -> Json<TopHashesResponse> {
    let limit = query.limit.unwrap_or(10).min(50);
    let mut counts: HashMap<&str, usize> = HashMap::new();
    for event in sample_events() {
        if let Some(hash) = event.tx_hash {
            *counts.entry(hash).or_insert(0) += 1;
        }
    }
    let mut hashes: Vec<(String, usize)> = counts
        .into_iter()
        .map(|(h, c)| (h.to_string(), c))
        .collect();
    hashes.sort_by(|a, b| b.1.cmp(&a.1));
    hashes.truncate(limit);
    Json(TopHashesResponse { hashes })
}

#[derive(Deserialize)]
pub struct IngestEvent {
    name: String,
    timestamp: String,
}

#[derive(Serialize)]
pub struct IngestResponse {
    pub accepted: usize,
    pub dropped: usize,
}

fn is_known_event(name: &str) -> bool {
    matches!(
        name,
        "page_view"
            | "button_click"
            | "form_submit"
            | "api_call"
            | "error_occurred"
            | "login"
            | "logout"
            | "search"
            | "purchase"
            | "refund"
    )
}

pub async fn analytics_ingest(Json(events): Json<Vec<IngestEvent>>) -> Json<IngestResponse> {
    let mut accepted = 0usize;
    let mut dropped = 0usize;
    for event in &events {
        if is_known_event(&event.name) && event.timestamp.contains('T') {
            accepted += 1;
        } else {
            dropped += 1;
        }
    }
    Json(IngestResponse { accepted, dropped })
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::extract::Query as AxumQuery;

    #[tokio::test]
    async fn errors_groups_by_status_code() {
        let Json(response) = analytics_errors().await;
        assert_eq!(response.breakdown.get("500"), Some(&2));
        assert_eq!(response.breakdown.get("400"), Some(&1));
    }

    #[tokio::test]
    async fn top_hashes_orders_by_frequency_and_respects_limit() {
        let Json(response) =
            analytics_top_hashes(AxumQuery(TopHashesQuery { limit: Some(1) })).await;
        assert_eq!(response.hashes, vec![("abc123".to_string(), 2)]);
    }

    #[tokio::test]
    async fn ingest_drops_invalid_events_and_counts_both() {
        let events = vec![
            IngestEvent {
                name: "login".into(),
                timestamp: "2024-01-01T00:00:00Z".into(),
            },
            IngestEvent {
                name: "not_a_real_event".into(),
                timestamp: "2024-01-01T00:00:00Z".into(),
            },
        ];
        let Json(response) = analytics_ingest(Json(events)).await;
        assert_eq!(response.accepted, 1);
        assert_eq!(response.dropped, 1);
    }
}
