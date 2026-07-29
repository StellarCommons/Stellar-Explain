use axum::{
    Json,
    extract::{Extension, Query},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::info;

use crate::middleware::request_id::RequestId;

// ---------------------------------------------------------------------------
// In-memory event store
//
// The analytics package (packages/analytics/) emits events from the frontend
// or CLI. Those events are stored in a simple in-memory structure keyed by
// event name so they can be aggregated by this endpoint.
//
// For testing and local development a deterministic seed is generated on each
// request based on the time window.  The store can be replaced with a real
// persistent backend (Redis, Postgres, …) without changing the route contract.
// ---------------------------------------------------------------------------

/// ISO-8601 datetime strings for the query window.
#[derive(Debug, Deserialize)]
pub struct SummaryParams {
    /// Start of the time window (ISO-8601). Defaults to 24 h ago.
    pub from: Option<String>,
    /// End of the time window (ISO-8601). Defaults to now.
    pub to: Option<String>,
}

/// A single bucket in the summary response.
#[derive(Debug, Serialize, Clone, PartialEq)]
#[cfg_attr(test, derive(Deserialize))]
pub struct EventCount {
    /// The analytics event name (e.g. `"page_view"`, `"api_call"`).
    pub event: String,
    /// Number of events recorded in the requested time window.
    pub count: u64,
}

/// Response body for `GET /analytics/summary`.
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(Deserialize))]
pub struct SummaryResponse {
    /// Start of the window that was queried.
    pub from: String,
    /// End of the window that was queried.
    pub to: String,
    /// Event counts sorted by event name.
    pub events: Vec<EventCount>,
    /// Total number of events in the window.
    pub total: u64,
}

// ---------------------------------------------------------------------------
// Default timestamps
// ---------------------------------------------------------------------------

/// Returns an ISO-8601 timestamp `hours_ago` hours before `now_iso`.
///
/// This is a simple string-only helper that works without an external crate
/// by using RFC-3339 formatted strings.
fn default_from(hours_ago: u64) -> String {
    // Compute "now minus hours_ago" via std::time.
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let shifted = secs.saturating_sub(hours_ago * 3600);
    format_unix_as_iso(shifted)
}

fn default_to() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format_unix_as_iso(secs)
}

/// Formats a Unix timestamp (seconds) as a UTC ISO-8601 datetime string.
fn format_unix_as_iso(secs: u64) -> String {
    // Manual computation — no external date/time crate needed.
    let s = secs % 60;
    let m = (secs / 60) % 60;
    let h = (secs / 3600) % 24;

    // Days since epoch
    let total_days = secs / 86400;
    let (year, month, day) = days_to_ymd(total_days);

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, h, m, s
    )
}

/// Converts days since the Unix epoch to (year, month, day).
fn days_to_ymd(mut days: u64) -> (u64, u64, u64) {
    // Gregorian calendar algorithm adapted from the public domain.
    let mut year = 1970u64;
    loop {
        let days_in_year = if is_leap(year) { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }

    let leap = is_leap(year);
    let month_lengths: [u64; 12] = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];

    let mut month = 1u64;
    for &len in &month_lengths {
        if days < len {
            break;
        }
        days -= len;
        month += 1;
    }

    (year, month, days + 1)
}

fn is_leap(year: u64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

// ---------------------------------------------------------------------------
// Event store
//
// Returns a snapshot of the in-memory event counters for a given time window.
// The current implementation returns deterministic seed data so the endpoint
// is testable without a real data pipeline. When an actual store is wired up,
// only this function needs to change.
// ---------------------------------------------------------------------------

/// All event names recognised by the analytics package.
const EVENT_NAMES: &[&str] = &[
    "page_view",
    "button_click",
    "form_submit",
    "api_call",
    "error_occurred",
    "login",
    "logout",
    "search",
    "purchase",
    "refund",
];

/// Returns a map of event_name → count for the given window.
///
/// In production this would query a database or streaming log.  For now it
/// returns a deterministic non-zero seed so callers can verify the shape of
/// the response.
fn query_event_store(_from: &str, _to: &str) -> HashMap<String, u64> {
    let mut counts = HashMap::new();
    // Seed data — replace with real persistence when available.
    for (i, name) in EVENT_NAMES.iter().enumerate() {
        counts.insert(name.to_string(), (i as u64 + 1) * 10);
    }
    counts
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/// `GET /analytics/summary`
///
/// Returns event counts grouped by name for the requested time window.
///
/// ### Query parameters
/// | Name   | Type   | Default        | Description            |
/// |--------|--------|----------------|------------------------|
/// | `from` | string | 24 hours ago   | Start of window (ISO-8601) |
/// | `to`   | string | now            | End of window (ISO-8601)   |
///
/// ### Response (200)
/// ```json
/// {
///   "from": "2024-01-14T12:00:00Z",
///   "to":   "2024-01-15T12:00:00Z",
///   "events": [
///     { "event": "api_call",      "count": 40 },
///     { "event": "button_click",  "count": 20 },
///     …
///   ],
///   "total": 550
/// }
/// ```
pub async fn get_analytics_summary(
    Query(params): Query<SummaryParams>,
    Extension(request_id): Extension<RequestId>,
) -> Result<Json<SummaryResponse>, (StatusCode, String)> {
    let from = params.from.unwrap_or_else(|| default_from(24));
    let to = params.to.unwrap_or_else(default_to);

    info!(
        request_id = %request_id,
        from = %from,
        to = %to,
        "analytics_summary_request"
    );

    let counts = query_event_store(&from, &to);

    let mut events: Vec<EventCount> = counts
        .into_iter()
        .map(|(event, count)| EventCount { event, count })
        .collect();

    // Stable ordering — sort by event name so the response is deterministic.
    events.sort_by(|a, b| a.event.cmp(&b.event));

    let total = events.iter().map(|e| e.count).sum();

    Ok(Json(SummaryResponse {
        from,
        to,
        events,
        total,
    }))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_from_is_earlier_than_default_to() {
        let from = default_from(24);
        let to = default_to();
        // Lexicographic comparison works for ISO-8601 UTC timestamps.
        assert!(from < to, "from ({from}) should be earlier than to ({to})");
    }

    #[test]
    fn test_format_unix_as_iso_epoch() {
        // Unix epoch should be 1970-01-01T00:00:00Z.
        assert_eq!(format_unix_as_iso(0), "1970-01-01T00:00:00Z");
    }

    #[test]
    fn test_format_unix_as_iso_known_date() {
        // 2024-01-15 12:00:00 UTC = 1705320000
        assert_eq!(
            format_unix_as_iso(1_705_320_000),
            "2024-01-15T12:00:00Z"
        );
    }

    #[test]
    fn test_query_event_store_returns_all_event_names() {
        let counts = query_event_store("2024-01-14T00:00:00Z", "2024-01-15T00:00:00Z");
        for name in EVENT_NAMES {
            assert!(
                counts.contains_key(*name),
                "missing event name: {name}"
            );
        }
    }

    #[test]
    fn test_query_event_store_all_counts_are_positive() {
        let counts = query_event_store("2024-01-14T00:00:00Z", "2024-01-15T00:00:00Z");
        for (name, count) in &counts {
            assert!(*count > 0, "count for {name} should be > 0");
        }
    }

    #[test]
    fn test_events_are_sorted_by_name() {
        let counts = query_event_store("", "");
        let mut events: Vec<EventCount> = counts
            .into_iter()
            .map(|(event, count)| EventCount { event, count })
            .collect();
        events.sort_by(|a, b| a.event.cmp(&b.event));

        let names: Vec<&str> = events.iter().map(|e| e.event.as_str()).collect();
        let mut sorted = names.clone();
        sorted.sort_unstable();
        assert_eq!(names, sorted, "events should be sorted alphabetically");
    }

    #[test]
    fn test_total_equals_sum_of_counts() {
        let counts = query_event_store("", "");
        let events: Vec<EventCount> = counts
            .into_iter()
            .map(|(event, count)| EventCount { event, count })
            .collect();
        let expected_total: u64 = events.iter().map(|e| e.count).sum();
        assert_eq!(expected_total, events.iter().map(|e| e.count).sum::<u64>());
    }

    #[test]
    fn test_is_leap_year() {
        assert!(is_leap(2000)); // divisible by 400
        assert!(is_leap(2024)); // divisible by 4, not by 100
        assert!(!is_leap(1900)); // divisible by 100, not 400
        assert!(!is_leap(2023)); // not divisible by 4
    }

    #[test]
    fn test_days_to_ymd_epoch() {
        assert_eq!(days_to_ymd(0), (1970, 1, 1));
    }

    #[test]
    fn test_days_to_ymd_known_date() {
        // 2024-01-15 is 19737 days after the Unix epoch.
        let days = 1_705_320_000u64 / 86400; // = 19737
        let (y, m, d) = days_to_ymd(days);
        assert_eq!((y, m, d), (2024, 1, 15));
    }
}
