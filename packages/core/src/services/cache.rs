use dashmap::DashMap;
use serde_json::Value;
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct CachedEntry {
    pub data: Value,
    pub inserted_at: Instant,
}

impl CachedEntry {
    pub fn new(data: Value) -> Self {
        Self {
            data,
            inserted_at: Instant::now(),
        }
    }

    pub fn is_expired(&self, ttl: Duration) -> bool {
        self.inserted_at.elapsed() > ttl
    }
}

pub struct TransactionCache {
    cache: DashMap<String, CachedEntry>,
    ttl: Duration,
}

impl TransactionCache {
    pub fn new(ttl_seconds: u64) -> Self {
        Self {
            cache: DashMap::new(),
            ttl: Duration::from_secs(ttl_seconds),
        }
    }

    pub fn get(&self, key: &str) -> Option<Value> {
        if let Some(entry) = self.cache.get(key) {
            if !entry.is_expired(self.ttl) {
                return Some(entry.data.clone());
            }
            // Entry expired, remove it
            drop(entry);
            self.cache.remove(key);
        }
        None
    }

    pub fn insert(&self, key: String, value: Value) {
        self.cache.insert(key, CachedEntry::new(value));
    }

    pub fn clear_expired(&self) {
        self.cache.retain(|_, entry| !entry.is_expired(self.ttl));
    }
}

impl Default for TransactionCache {
    fn default() -> Self {
        Self::new(300) // 5 minutes default TTL
    }
}
