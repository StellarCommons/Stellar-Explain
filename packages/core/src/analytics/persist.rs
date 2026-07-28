use serde::{Deserialize, Serialize};
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::sync::RwLock;
use std::time::Duration;

/// How often `flush_to_disk` should be called by a background task.
pub const PERSIST_INTERVAL: Duration = Duration::from_secs(300);

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StoredEvent {
    pub name: String,
    pub timestamp: String,
}

pub struct EventStore {
    events: RwLock<Vec<StoredEvent>>,
    path: String,
}

impl EventStore {
    pub fn load_default() -> Self {
        let path = std::env::var("ANALYTICS_LOG_PATH")
            .unwrap_or_else(|_| "./analytics.ndjson".to_string());
        Self::load_from_path(path)
    }

    pub fn load_from_path(path: impl Into<String>) -> Self {
        let path = path.into();
        let events = File::open(&path)
            .map(|file| {
                BufReader::new(file)
                    .lines()
                    .map_while(Result::ok)
                    .filter_map(|line| serde_json::from_str(&line).ok())
                    .collect()
            })
            .unwrap_or_else(|_| {
                tracing::warn!(path = %path, "analytics_log_missing_or_unreadable");
                Vec::new()
            });
        Self {
            events: RwLock::new(events),
            path,
        }
    }

    pub fn record(&self, event: StoredEvent) {
        self.events.write().unwrap().push(event);
    }

    pub fn flush_to_disk(&self) -> std::io::Result<()> {
        let mut file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&self.path)?;
        for event in self.events.read().unwrap().iter() {
            writeln!(file, "{}", serde_json::to_string(event).unwrap())?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flush_then_reload_round_trips_events() {
        let path =
            std::env::temp_dir().join(format!("analytics-test-{}.ndjson", std::process::id()));
        let path = path.to_str().unwrap().to_string();

        let store = EventStore::load_from_path(&path);
        store.record(StoredEvent {
            name: "login".into(),
            timestamp: "2024-01-01T00:00:00Z".into(),
        });
        store.flush_to_disk().unwrap();

        let reloaded = EventStore::load_from_path(&path);
        assert_eq!(reloaded.events.read().unwrap().len(), 1);
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn missing_file_degrades_to_empty_store() {
        let store = EventStore::load_from_path("./this-file-does-not-exist.ndjson");
        assert!(store.events.read().unwrap().is_empty());
    }
}
