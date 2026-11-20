use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AnalyticsEvent {
    pub id: String,
    pub name: String,
    pub timestamp: u64,
    #[serde(default)]
    pub properties: Option<serde_json::Value>,
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default)]
    pub session_id: Option<String>,
}

#[derive(Debug)]
pub struct EventStore {
    events: Vec<AnalyticsEvent>,
    max_capacity: usize,
}

impl EventStore {
    pub fn new(max_capacity: usize) -> Self {
        Self {
            events: Vec::with_capacity(max_capacity),
            max_capacity,
        }
    }

    pub fn insert(&mut self, event: AnalyticsEvent) -> bool {
        if self.events.len() >= self.max_capacity {
            self.events.remove(0);
        }
        self.events.push(event);
        true
    }

    pub fn query_by_time_range(&self, start: u64, end: u64) -> Vec<&AnalyticsEvent> {
        self.events
            .iter()
            .filter(|e| e.timestamp >= start && e.timestamp <= end)
            .collect()
    }

    pub fn len(&self) -> usize {
        self.events.len()
    }

    pub fn is_empty(&self) -> bool {
        self.events.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_event(id: &str, name: &str, timestamp: u64) -> AnalyticsEvent {
        AnalyticsEvent {
            id: id.to_string(),
            name: name.to_string(),
            timestamp,
            properties: None,
            user_id: None,
            session_id: None,
        }
    }

    #[test]
    fn test_insert_single_event() {
        let mut store = EventStore::new(100);
        let event = make_event("1", "page_view", 1000);
        assert!(store.insert(event));
        assert_eq!(store.len(), 1);
        assert!(!store.is_empty());
    }

    #[test]
    fn test_insert_multiple_events() {
        let mut store = EventStore::new(100);
        store.insert(make_event("1", "page_view", 1000));
        store.insert(make_event("2", "button_click", 2000));
        store.insert(make_event("3", "form_submit", 3000));
        assert_eq!(store.len(), 3);
    }

    #[test]
    fn test_query_by_time_range_exact_bounds() {
        let mut store = EventStore::new(100);
        store.insert(make_event("1", "page_view", 100));
        store.insert(make_event("2", "page_view", 200));
        store.insert(make_event("3", "page_view", 300));

        let results = store.query_by_time_range(100, 200);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].id, "1");
        assert_eq!(results[1].id, "2");
    }

    #[test]
    fn test_query_by_time_range_no_results() {
        let mut store = EventStore::new(100);
        store.insert(make_event("1", "page_view", 100));
        store.insert(make_event("2", "page_view", 200));

        let results = store.query_by_time_range(500, 600);
        assert!(results.is_empty());
    }

    #[test]
    fn test_query_by_time_range_inclusive() {
        let mut store = EventStore::new(100);
        store.insert(make_event("1", "page_view", 100));
        store.insert(make_event("2", "page_view", 200));

        let results = store.query_by_time_range(100, 100);
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn test_max_capacity_eviction() {
        let mut store = EventStore::new(3);
        store.insert(make_event("1", "page_view", 100));
        store.insert(make_event("2", "button_click", 200));
        store.insert(make_event("3", "form_submit", 300));
        assert_eq!(store.len(), 3);

        // Inserting a 4th event evicts the oldest (id=1)
        store.insert(make_event("4", "api_call", 400));
        assert_eq!(store.len(), 3);

        let all = store.query_by_time_range(0, 1000);
        let ids: Vec<&str> = all.iter().map(|e| e.id.as_str()).collect();
        assert!(!ids.contains(&"1"));
        assert!(ids.contains(&"2"));
        assert!(ids.contains(&"3"));
        assert!(ids.contains(&"4"));
    }

    #[test]
    fn test_max_capacity_sequential_evictions() {
        let mut store = EventStore::new(2);
        store.insert(make_event("1", "a", 10));
        store.insert(make_event("2", "b", 20));
        store.insert(make_event("3", "c", 30));
        store.insert(make_event("4", "d", 40));

        assert_eq!(store.len(), 2);
        let results = store.query_by_time_range(0, 100);
        let ids: Vec<&str> = results.iter().map(|e| e.id.as_str()).collect();
        assert_eq!(ids, vec!["3", "4"]);
    }

    #[test]
    fn test_empty_store() {
        let store = EventStore::new(50);
        assert!(store.is_empty());
        assert_eq!(store.len(), 0);
        assert!(store.query_by_time_range(0, 100).is_empty());
    }

    #[test]
    fn test_event_with_properties() {
        let mut store = EventStore::new(100);
        let event = AnalyticsEvent {
            id: "1".to_string(),
            name: "purchase".to_string(),
            timestamp: 1000,
            properties: Some(serde_json::json!({"amount": 42.0, "currency": "XLM"})),
            user_id: Some("user-abc".to_string()),
            session_id: Some("sess-xyz".to_string()),
        };
        store.insert(event);

        let results = store.query_by_time_range(0, 2000);
        assert_eq!(results.len(), 1);
        assert_eq!(
            results[0].properties.as_ref().unwrap()["amount"],
            serde_json::json!(42.0)
        );
        assert_eq!(results[0].user_id.as_deref(), Some("user-abc"));
        assert_eq!(results[0].session_id.as_deref(), Some("sess-xyz"));
    }
}
