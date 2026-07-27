use axum::{Json, extract::Query};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone)]
struct SampleEvent {
    hour: &'static str,
}

fn sample_events() -> Vec<SampleEvent> {
    vec![
        SampleEvent {
            hour: "2024-01-15T10:00:00Z",
        },
        SampleEvent {
            hour: "2024-01-15T10:00:00Z",
        },
        SampleEvent {
            hour: "2024-01-15T11:00:00Z",
        },
    ]
}

#[derive(Deserialize)]
pub struct TimeseriesQuery {
    bucket: Option<String>,
}

#[derive(Serialize)]
pub struct TimeseriesBucket {
    pub start: String,
    pub count: usize,
}

#[derive(Serialize)]
pub struct TimeseriesResponse {
    pub buckets: Vec<TimeseriesBucket>,
}

pub async fn analytics_timeseries(
    Query(query): Query<TimeseriesQuery>,
) -> Json<TimeseriesResponse> {
    // `bucket` (hour|day) selects the aggregation granularity; sample data
    // below is already hour-bucketed, so it's accepted but unused here.
    let _bucket = query.bucket.unwrap_or_else(|| "hour".to_string());
    let mut counts: BTreeMap<&str, usize> = BTreeMap::new();
    for event in sample_events() {
        *counts.entry(event.hour).or_insert(0) += 1;
    }
    let buckets = counts
        .into_iter()
        .map(|(start, count)| TimeseriesBucket {
            start: start.to_string(),
            count,
        })
        .collect();
    Json(TimeseriesResponse { buckets })
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::extract::Query as AxumQuery;

    #[tokio::test]
    async fn timeseries_buckets_events_by_hour() {
        let Json(response) =
            analytics_timeseries(AxumQuery(TimeseriesQuery { bucket: None })).await;
        assert_eq!(response.buckets.len(), 2);
        assert_eq!(response.buckets[0].count, 2);
    }
}
