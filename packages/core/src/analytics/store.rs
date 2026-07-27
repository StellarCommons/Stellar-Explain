use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::{Arc, RwLock};

pub const MAX_CAPACITY: usize = 100_000;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StoredEvent {
    pub name: String,
    pub timestamp: String,
}

#[derive(Clone)]
pub struct EventStore {
    events: Arc<RwLock<VecDeque<StoredEvent>>>,
}

impl Default for EventStore {
    fn default() -> Self {
        Self::new()
    }
}

impl EventStore {
    pub fn new() -> Self {
        Self {
            events: Arc::new(RwLock::new(VecDeque::new())),
        }
    }

    pub fn record(&self, event: StoredEvent) {
        let mut events = self.events.write().unwrap();
        if events.len() >= MAX_CAPACITY {
            events.pop_front();
        }
        events.push_back(event);
    }

    pub fn len(&self) -> usize {
        self.events.read().unwrap().len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    pub fn all(&self) -> Vec<StoredEvent> {
        self.events.read().unwrap().iter().cloned().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn records_and_lists_events_in_order() {
        let store = EventStore::new();
        store.record(StoredEvent {
            name: "login".into(),
            timestamp: "t1".into(),
        });
        store.record(StoredEvent {
            name: "logout".into(),
            timestamp: "t2".into(),
        });
        assert_eq!(store.len(), 2);
        assert_eq!(store.all()[0].name, "login");
    }

    #[test]
    fn evicts_oldest_event_once_capacity_is_exceeded() {
        let store = EventStore::new();
        for i in 0..=MAX_CAPACITY {
            store.record(StoredEvent {
                name: format!("e{i}"),
                timestamp: "t".into(),
            });
        }
        assert_eq!(store.len(), MAX_CAPACITY);
        assert_eq!(store.all().first().unwrap().name, "e1");
    }
}
