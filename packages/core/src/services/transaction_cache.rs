use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use std::hash::{Hash, Hasher};

/// Represents a Stellar network
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Network {
    Public,
    Testnet,
    Futurenet,
    Custom(&'static str),
}

/// Cache key combining transaction hash and network
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct CacheKey {
    /// Transaction hash (64 hex characters)
    pub tx_hash: String,
    /// Network where the transaction exists
    pub network: Network,
}

impl CacheKey {
    pub fn new(tx_hash: String, network: Network) -> Self {
        Self { tx_hash, network }
    }
}

/// Cached entry with TTL tracking
#[derive(Debug, Clone)]
struct CacheEntry<T> {
    /// The cached value
    value: T,
    /// When this entry was created
    created_at: Instant,
    /// Time-to-live duration
    ttl: Duration,
}

impl<T> CacheEntry<T> {
    fn new(value: T, ttl: Duration) -> Self {
        Self {
            value,
            created_at: Instant::now(),
            ttl,
        }
    }

    /// Check if this entry has expired
    fn is_expired(&self) -> bool {
        self.created_at.elapsed() > self.ttl
    }

    /// Get remaining time until expiration
    fn time_until_expiry(&self) -> Duration {
        self.ttl.saturating_sub(self.created_at.elapsed())
    }
}

/// Thread-safe in-memory cache for transaction explanations
pub struct TransactionCache<T> {
    /// Internal cache storage with RwLock for safe concurrency
    cache: Arc<RwLock<HashMap<CacheKey, CacheEntry<T>>>>,
    /// Default TTL for new entries
    default_ttl: Duration,
}

impl<T: Clone> TransactionCache<T> {
    /// Create a new cache with default TTL
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            default_ttl,
        }
    }

    /// Create a new cache with 5 minute default TTL
    pub fn with_default_ttl() -> Self {
        Self::new(Duration::from_secs(5 * 60))
    }

    /// Insert or update a cache entry
    /// 
    /// Returns true if this is a new entry, false if updating existing
    pub fn insert(&self, key: CacheKey, value: T) -> bool {
        let mut cache = self.cache.write().unwrap();
        let entry = CacheEntry::new(value, self.default_ttl);
        cache.insert(key, entry).is_none()
    }

    /// Insert with custom TTL
    pub fn insert_with_ttl(&self, key: CacheKey, value: T, ttl: Duration) -> bool {
        let mut cache = self.cache.write().unwrap();
        let entry = CacheEntry::new(value, ttl);
        cache.insert(key, entry).is_none()
    }

    /// Get a value from the cache
    /// 
    /// Returns None if:
    /// - Key doesn't exist
    /// - Entry has expired (also removes it)
    pub fn get(&self, key: &CacheKey) -> Option<T> {
        // First, check with read lock (fast path)
        {
            let cache = self.cache.read().unwrap();
            if let Some(entry) = cache.get(key) {
                if !entry.is_expired() {
                    return Some(entry.value.clone());
                }
            }
        }

        // If expired or not found, acquire write lock to clean up
        let mut cache = self.cache.write().unwrap();
        if let Some(entry) = cache.get(key) {
            if entry.is_expired() {
                cache.remove(key);
                return None;
            }
            Some(entry.value.clone())
        } else {
            None
        }
    }

    /// Check if a key exists and is not expired
    pub fn contains_key(&self, key: &CacheKey) -> bool {
        let cache = self.cache.read().unwrap();
        cache.get(key)
            .map(|entry| !entry.is_expired())
            .unwrap_or(false)
    }

    /// Remove an entry from the cache
    pub fn remove(&self, key: &CacheKey) -> Option<T> {
        let mut cache = self.cache.write().unwrap();
        cache.remove(key).map(|entry| entry.value)
    }

    /// Clear all entries from the cache
    pub fn clear(&self) {
        let mut cache = self.cache.write().unwrap();
        cache.clear();
    }

    /// Remove all expired entries (garbage collection)
    /// 
    /// Returns the number of entries removed
    pub fn evict_expired(&self) -> usize {
        let mut cache = self.cache.write().unwrap();
        let initial_len = cache.len();
        cache.retain(|_, entry| !entry.is_expired());
        initial_len - cache.len()
    }

    /// Get the number of entries in the cache (including expired)
    pub fn len(&self) -> usize {
        let cache = self.cache.read().unwrap();
        cache.len()
    }

    /// Check if the cache is empty
    pub fn is_empty(&self) -> bool {
        let cache = self.cache.read().unwrap();
        cache.is_empty()
    }

    /// Get cache statistics
    pub fn stats(&self) -> CacheStats {
        let cache = self.cache.read().unwrap();
        let total = cache.len();
        let expired = cache.values().filter(|e| e.is_expired()).count();
        
        CacheStats {
            total_entries: total,
            expired_entries: expired,
            valid_entries: total - expired,
        }
    }
}

/// Cache statistics
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CacheStats {
    pub total_entries: usize,
    pub expired_entries: usize,
    pub valid_entries: usize,
}

/// Clone implementation for thread-safe sharing
impl<T> Clone for TransactionCache<T> {
    fn clone(&self) -> Self {
        Self {
            cache: Arc::clone(&self.cache),
            default_ttl: self.default_ttl,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[derive(Debug, Clone, PartialEq, Eq)]
    struct TransactionExplanation {
        tx_hash: String,
        explanation: String,
    }

    #[test]
    fn test_cache_basic_operations() {
        let cache: TransactionCache<String> = TransactionCache::new(Duration::from_secs(60));
        let key = CacheKey::new("abc123".to_string(), Network::Public);

        // Insert
        assert!(cache.insert(key.clone(), "explanation".to_string()));
        assert_eq!(cache.len(), 1);

        // Get
        assert_eq!(cache.get(&key), Some("explanation".to_string()));

        // Contains
        assert!(cache.contains_key(&key));

        // Remove
        assert_eq!(cache.remove(&key), Some("explanation".to_string()));
        assert!(!cache.contains_key(&key));
        assert!(cache.is_empty());
    }

    #[test]
    fn test_cache_key_uniqueness() {
        let cache: TransactionCache<String> = TransactionCache::with_default_ttl();
        
        let key1 = CacheKey::new("hash1".to_string(), Network::Public);
        let key2 = CacheKey::new("hash1".to_string(), Network::Testnet);
        let key3 = CacheKey::new("hash2".to_string(), Network::Public);

        cache.insert(key1.clone(), "public".to_string());
        cache.insert(key2.clone(), "testnet".to_string());
        cache.insert(key3.clone(), "different".to_string());

        // Same hash, different network = different cache entry
        assert_eq!(cache.get(&key1), Some("public".to_string()));
        assert_eq!(cache.get(&key2), Some("testnet".to_string()));
        assert_eq!(cache.get(&key3), Some("different".to_string()));
        assert_eq!(cache.len(), 3);
    }

    #[test]
    fn test_cache_hit_avoids_recomputation() {
        let cache: TransactionCache<TransactionExplanation> = TransactionCache::with_default_ttl();
        let key = CacheKey::new("tx123".to_string(), Network::Public);

        // First call - cache miss
        assert_eq!(cache.get(&key), None);

        // Simulate expensive computation and cache it
        let explanation = TransactionExplanation {
            tx_hash: "tx123".to_string(),
            explanation: "Expensive computation result".to_string(),
        };
        cache.insert(key.clone(), explanation.clone());

        // Second call - cache hit (no recomputation needed)
        assert_eq!(cache.get(&key), Some(explanation.clone()));
        assert_eq!(cache.get(&key), Some(explanation)); // Still cached
    }

    #[test]
    fn test_ttl_expiration() {
        let cache: TransactionCache<String> = TransactionCache::new(Duration::from_millis(100));
        let key = CacheKey::new("short_lived".to_string(), Network::Public);

        cache.insert(key.clone(), "value".to_string());
        assert_eq!(cache.get(&key), Some("value".to_string()));

        // Wait for TTL to expire
        thread::sleep(Duration::from_millis(150));

        // Entry should be expired and removed
        assert_eq!(cache.get(&key), None);
        assert!(!cache.contains_key(&key));
    }

    #[test]
    fn test_custom_ttl() {
        let cache: TransactionCache<String> = TransactionCache::new(Duration::from_secs(60));
        let key = CacheKey::new("custom_ttl".to_string(), Network::Public);

        // Insert with very short custom TTL
        cache.insert_with_ttl(key.clone(), "value".to_string(), Duration::from_millis(50));
        
        assert_eq!(cache.get(&key), Some("value".to_string()));
        
        thread::sleep(Duration::from_millis(100));
        assert_eq!(cache.get(&key), None);
    }

    #[test]
    fn test_cache_update() {
        let cache: TransactionCache<String> = TransactionCache::with_default_ttl();
        let key = CacheKey::new("update_test".to_string(), Network::Public);

        // First insert
        assert!(cache.insert(key.clone(), "first".to_string()));
        
        // Update existing key
        assert!(!cache.insert(key.clone(), "second".to_string()));
        
        assert_eq!(cache.get(&key), Some("second".to_string()));
    }

    #[test]
    fn test_clear_cache() {
        let cache: TransactionCache<String> = TransactionCache::with_default_ttl();
        
        cache.insert(CacheKey::new("tx1".to_string(), Network::Public), "val1".to_string());
        cache.insert(CacheKey::new("tx2".to_string(), Network::Testnet), "val2".to_string());
        
        assert_eq!(cache.len(), 2);
        
        cache.clear();
        
        assert_eq!(cache.len(), 0);
        assert!(cache.is_empty());
    }

    #[test]
    fn test_evict_expired() {
        let cache: TransactionCache<String> = TransactionCache::new(Duration::from_millis(50));
        
        // Add entries that will expire
        cache.insert(CacheKey::new("tx1".to_string(), Network::Public), "val1".to_string());
        cache.insert(CacheKey::new("tx2".to_string(), Network::Public), "val2".to_string());
        
        thread::sleep(Duration::from_millis(100));
        
        // Add fresh entry
        cache.insert_with_ttl(
            CacheKey::new("tx3".to_string(), Network::Public),
            "val3".to_string(),
            Duration::from_secs(60)
        );
        
        assert_eq!(cache.len(), 3);
        
        // Evict expired entries
        let evicted = cache.evict_expired();
        assert_eq!(evicted, 2);
        assert_eq!(cache.len(), 1);
    }

    #[test]
    fn test_cache_stats() {
        let cache: TransactionCache<String> = TransactionCache::new(Duration::from_millis(100));
        
        cache.insert(CacheKey::new("tx1".to_string(), Network::Public), "val1".to_string());
        cache.insert(CacheKey::new("tx2".to_string(), Network::Public), "val2".to_string());
        
        let stats = cache.stats();
        assert_eq!(stats.total_entries, 2);
        assert_eq!(stats.valid_entries, 2);
        assert_eq!(stats.expired_entries, 0);
        
        thread::sleep(Duration::from_millis(150));
        
        let stats = cache.stats();
        assert_eq!(stats.total_entries, 2);
        assert_eq!(stats.expired_entries, 2);
        assert_eq!(stats.valid_entries, 0);
    }

    #[test]
    fn test_thread_safe_concurrent_access() {
        let cache: TransactionCache<String> = TransactionCache::with_default_ttl();
        let cache_clone = cache.clone();

        // Spawn multiple threads writing to the cache
        let handles: Vec<_> = (0..10)
            .map(|i| {
                let cache = cache.clone();
                thread::spawn(move || {
                    for j in 0..10 {
                        let key = CacheKey::new(
                            format!("tx_{}", i * 10 + j),
                            Network::Public
                        );
                        cache.insert(key, format!("value_{}", i * 10 + j));
                    }
                })
            })
            .collect();

        // Wait for all threads
        for handle in handles {
            handle.join().unwrap();
        }

        // All 100 entries should be present
        assert_eq!(cache_clone.len(), 100);
    }

    #[test]
    fn test_thread_safe_concurrent_read_write() {
        let cache: TransactionCache<u64> = TransactionCache::with_default_ttl();
        let key = CacheKey::new("shared_key".to_string(), Network::Public);
        
        cache.insert(key.clone(), 0);

        // Multiple readers and writers
        let mut handles = vec![];

        // Writers
        for i in 0..5 {
            let cache = cache.clone();
            let key = key.clone();
            handles.push(thread::spawn(move || {
                for _ in 0..20 {
                    cache.insert(key.clone(), i as u64);
                    thread::sleep(Duration::from_micros(10));
                }
            }));
        }

        // Readers
        for _ in 0..5 {
            let cache = cache.clone();
            let key = key.clone();
            handles.push(thread::spawn(move || {
                for _ in 0..20 {
                    let _ = cache.get(&key);
                    thread::sleep(Duration::from_micros(10));
                }
            }));
        }

        for handle in handles {
            handle.join().unwrap();
        }

        // Should still have exactly one entry for the key
        assert!(cache.contains_key(&key));
    }

    #[test]
    fn test_network_types() {
        let cache: TransactionCache<String> = TransactionCache::with_default_ttl();
        
        let networks = vec![
            Network::Public,
            Network::Testnet,
            Network::Futurenet,
            Network::Custom("private"),
        ];

        for network in networks {
            let key = CacheKey::new("same_hash".to_string(), network);
            cache.insert(key, format!("{:?}", network));
        }

        assert_eq!(cache.len(), 4);
    }

    #[test]
    fn test_cache_does_not_grow_unbounded() {
        let cache: TransactionCache<String> = TransactionCache::new(Duration::from_millis(10));
        
        // Add many entries
        for i in 0..1000 {
            let key = CacheKey::new(format!("tx_{}", i), Network::Public);
            cache.insert(key, format!("value_{}", i));
        }
        
        assert_eq!(cache.len(), 1000);
        
        // Wait for expiration
        thread::sleep(Duration::from_millis(50));
        
        // Evict expired entries
        let evicted = cache.evict_expired();
        assert_eq!(evicted, 1000);
        assert_eq!(cache.len(), 0);
    }
}