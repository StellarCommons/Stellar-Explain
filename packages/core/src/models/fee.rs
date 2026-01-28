//! Fee statistics and related types for Stellar transactions.
//!
//! This module contains types for representing fee information from the Stellar network,
//! including base fees, fee statistics, and fee-related utilities.

use serde::{Deserialize, Serialize};

/// Statistics about network fees at a given point in time.
///
/// These statistics are typically retrieved from Horizon's `/fee_stats` endpoint
/// and help determine appropriate fee levels for transactions.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FeeStats {
    /// The base fee set by the network (in stroops).
    /// This is the minimum fee required for a transaction.
    pub base_fee: u64,

    /// The minimum fee charged in the last ledger (in stroops).
    pub min_fee: u64,

    /// The maximum fee charged in the last ledger (in stroops).
    pub max_fee: u64,

    /// The most common fee (mode) charged in the last ledger (in stroops).
    pub mode_fee: u64,

    /// The 90th percentile fee from the last ledger (in stroops).
    /// This represents a fee that would be higher than 90% of transactions.
    pub p90_fee: u64,
}

impl FeeStats {
    /// Creates a new FeeStats instance with the given values.
    ///
    /// # Arguments
    /// * `base_fee` - The network base fee in stroops
    /// * `min_fee` - The minimum fee observed in stroops
    /// * `max_fee` - The maximum fee observed in stroops
    /// * `mode_fee` - The most common fee in stroops
    /// * `p90_fee` - The 90th percentile fee in stroops
    ///
    /// # Example
    /// ```
    /// use stellar_explain_core::models::fee::FeeStats;
    ///
    /// let fees = FeeStats::new(100, 100, 5000, 100, 250);
    /// assert_eq!(fees.base_fee, 100);
    /// ```
    pub fn new(base_fee: u64, min_fee: u64, max_fee: u64, mode_fee: u64, p90_fee: u64) -> Self {
        Self {
            base_fee,
            min_fee,
            max_fee,
            mode_fee,
            p90_fee,
        }
    }

    /// Creates a default FeeStats with typical network values.
    ///
    /// This is useful for testing or when fee stats are unavailable.
    ///
    /// # Example
    /// ```
    /// use stellar_explain_core::models::fee::FeeStats;
    ///
    /// let fees = FeeStats::default_network_fees();
    /// assert_eq!(fees.base_fee, 100);
    /// ```
    pub fn default_network_fees() -> Self {
        Self {
            base_fee: 100,      // Standard base fee
            min_fee: 100,       // Minimum is typically the base fee
            max_fee: 100000,    // Reasonable maximum
            mode_fee: 100,      // Most common is base fee
            p90_fee: 1000,      // 90th percentile
        }
    }

    /// Determines if a given fee is considered "high" relative to the base fee.
    ///
    /// A fee is considered high if it's more than 5x the base fee.
    ///
    /// # Arguments
    /// * `fee` - The fee to check (in stroops)
    ///
    /// # Returns
    /// `true` if the fee is considered high, `false` otherwise
    ///
    /// # Example
    /// ```
    /// use stellar_explain_core::models::fee::FeeStats;
    ///
    /// let fees = FeeStats::default_network_fees();
    /// assert!(!fees.is_high_fee(100));  // base fee is not high
    /// assert!(fees.is_high_fee(1000));  // 10x base fee is high
    /// ```
    pub fn is_high_fee(&self, fee: u64) -> bool {
        fee > self.base_fee * 5
    }

    /// Gets a recommended fee based on the desired priority.
    ///
    /// # Arguments
    /// * `priority` - The desired priority level ("low", "medium", "high")
    ///
    /// # Returns
    /// The recommended fee in stroops
    ///
    /// # Example
    /// ```
    /// use stellar_explain_core::models::fee::FeeStats;
    ///
    /// let fees = FeeStats::default_network_fees();
    /// assert_eq!(fees.recommended_fee("low"), 100);
    /// assert_eq!(fees.recommended_fee("high"), 1000);
    /// ```
    pub fn recommended_fee(&self, priority: &str) -> u64 {
        match priority.to_lowercase().as_str() {
            "low" => self.base_fee,
            "medium" => self.mode_fee.max(self.base_fee),
            "high" => self.p90_fee.max(self.mode_fee),
            _ => self.base_fee,
        }
    }

    /// Converts stroops to XLM.
    ///
    /// # Arguments
    /// * `stroops` - The amount in stroops
    ///
    /// # Returns
    /// The amount in XLM as a string
    ///
    /// # Example
    /// ```
    /// use stellar_explain_core::models::fee::FeeStats;
    ///
    /// let xlm = FeeStats::stroops_to_xlm(10000000);
    /// assert_eq!(xlm, "1.0000000");
    /// ```
    pub fn stroops_to_xlm(stroops: u64) -> String {
        let xlm = stroops as f64 / 10_000_000.0;
        format!("{:.7}", xlm)
    }
}

impl Default for FeeStats {
    fn default() -> Self {
        Self::default_network_fees()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_fee_stats() {
        let fees = FeeStats::new(100, 100, 5000, 100, 250);
        assert_eq!(fees.base_fee, 100);
        assert_eq!(fees.min_fee, 100);
        assert_eq!(fees.max_fee, 5000);
        assert_eq!(fees.mode_fee, 100);
        assert_eq!(fees.p90_fee, 250);
    }

    #[test]
    fn test_default_network_fees() {
        let fees = FeeStats::default_network_fees();
        assert_eq!(fees.base_fee, 100);
        assert!(fees.max_fee > fees.base_fee);
    }

    #[test]
    fn test_is_high_fee() {
        let fees = FeeStats::new(100, 100, 5000, 100, 250);
        
        assert!(!fees.is_high_fee(100));   // base fee
        assert!(!fees.is_high_fee(250));   // 2.5x base fee
        assert!(!fees.is_high_fee(500));   // 5x base fee (threshold)
        assert!(fees.is_high_fee(600));    // 6x base fee
        assert!(fees.is_high_fee(1000));   // 10x base fee
    }

    #[test]
    fn test_recommended_fee() {
        let fees = FeeStats::new(100, 100, 5000, 200, 500);
        
        assert_eq!(fees.recommended_fee("low"), 100);
        assert_eq!(fees.recommended_fee("medium"), 200);
        assert_eq!(fees.recommended_fee("high"), 500);
        assert_eq!(fees.recommended_fee("invalid"), 100); // defaults to base
    }

    #[test]
    fn test_stroops_to_xlm() {
        assert_eq!(FeeStats::stroops_to_xlm(10000000), "1.0000000");
        assert_eq!(FeeStats::stroops_to_xlm(100), "0.0000100");
        assert_eq!(FeeStats::stroops_to_xlm(5000000), "0.5000000");
        assert_eq!(FeeStats::stroops_to_xlm(0), "0.0000000");
    }

    #[test]
    fn test_default_trait() {
        let fees = FeeStats::default();
        assert_eq!(fees.base_fee, 100);
        assert_eq!(fees, FeeStats::default_network_fees());
    }
}