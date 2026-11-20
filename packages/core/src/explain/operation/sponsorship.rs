//! Explainer for begin_sponsoring_future_reserves and end_sponsoring_future_reserves.
//!
//! Sponsorship allows one account (the sponsor) to pay reserve costs for ledger
//! entries owned by another account (the sponsored account). This is useful for
//! onboarding new users who may not have XLM to cover reserves.
//!
//! Both operations must appear in the same transaction: `begin` initiates the
//! sponsorship, and `end` terminates it. The operations in between are the
//! ones whose reserves are covered by the sponsor.
//!
//! Horizon fixtures verified against:
//! - begin: https://developers.stellar.org/docs/data/apis/horizon/api-reference/resources/operations/object/begin-sponsoring-future-reserves
//! - end: https://developers.stellar.org/docs/data/apis/horizon/api-reference/resources/operations/object/end-sponsoring-future-reserves

use crate::models::operation::{
    BeginSponsoringFutureReservesOperation, EndSponsoringFutureReservesOperation,
};
use serde::{Deserialize, Serialize};

/// Human-readable explanation of a begin_sponsoring_future_reserves operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BeginSponsorshipExplanation {
    /// Full natural-language summary.
    pub summary: String,
    /// The sponsoring account (source of this operation).
    pub sponsor: String,
    /// The account being sponsored.
    pub sponsored_id: String,
}

/// Human-readable explanation of an end_sponsoring_future_reserves operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EndSponsorshipExplanation {
    /// Full natural-language summary.
    pub summary: String,
    /// The sponsored account (source of this operation).
    pub sponsored_id: String,
    /// The account that initiated the sponsorship.
    pub begin_sponsor: String,
}

/// Explain a begin_sponsoring_future_reserves operation.
///
/// The sponsor (source account) agrees to pay reserve costs for the
/// sponsored account's future ledger entries.
pub fn explain_begin_sponsoring_future_reserves(
    op: &BeginSponsoringFutureReservesOperation,
) -> BeginSponsorshipExplanation {
    let sponsor = op
        .source_account
        .clone()
        .unwrap_or_else(|| "Unknown".to_string());

    let summary = format!(
        "{} agreed to sponsor future reserves for {}",
        sponsor, op.sponsored_id
    );

    BeginSponsorshipExplanation {
        summary,
        sponsor,
        sponsored_id: op.sponsored_id.clone(),
    }
}

/// Explain an end_sponsoring_future_reserves operation.
///
/// The sponsored account (source) terminates the sponsorship relationship
/// that was initiated by the begin_sponsor.
pub fn explain_end_sponsoring_future_reserves(
    op: &EndSponsoringFutureReservesOperation,
) -> EndSponsorshipExplanation {
    let sponsored_id = op
        .source_account
        .clone()
        .unwrap_or_else(|| "Unknown".to_string());

    let summary = format!(
        "{} ended sponsorship initiated by {}",
        sponsored_id, op.begin_sponsor
    );

    EndSponsorshipExplanation {
        summary,
        sponsored_id,
        begin_sponsor: op.begin_sponsor.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_begin() -> BeginSponsoringFutureReservesOperation {
        BeginSponsoringFutureReservesOperation {
            id: "op1".to_string(),
            source_account: Some("GSPONSOR".to_string()),
            sponsored_id: "GSPONSORED".to_string(),
        }
    }

    fn base_end() -> EndSponsoringFutureReservesOperation {
        EndSponsoringFutureReservesOperation {
            id: "op2".to_string(),
            source_account: Some("GSPONSORED".to_string()),
            begin_sponsor: "GSPONSOR".to_string(),
        }
    }

    // ── begin_sponsoring_future_reserves ──────────────────────────────────

    #[test]
    fn test_begin_sponsorship_summary() {
        let explanation = explain_begin_sponsoring_future_reserves(&base_begin());
        assert!(explanation.summary.contains("GSPONSOR"));
        assert!(explanation.summary.contains("GSPONSORED"));
        assert!(explanation.summary.contains("sponsor"));
    }

    #[test]
    fn test_begin_sponsorship_summary_format() {
        let explanation = explain_begin_sponsoring_future_reserves(&base_begin());
        assert!(
            explanation
                .summary
                .starts_with("GSPONSOR agreed to sponsor future reserves for GSPONSORED")
        );
    }

    #[test]
    fn test_begin_sponsorship_fields() {
        let explanation = explain_begin_sponsoring_future_reserves(&base_begin());
        assert_eq!(explanation.sponsor, "GSPONSOR");
        assert_eq!(explanation.sponsored_id, "GSPONSORED");
    }

    #[test]
    fn test_begin_sponsorship_unknown_source() {
        let op = BeginSponsoringFutureReservesOperation {
            source_account: None,
            ..base_begin()
        };
        let explanation = explain_begin_sponsoring_future_reserves(&op);
        assert!(explanation.summary.contains("Unknown"));
        assert_eq!(explanation.sponsor, "Unknown");
    }

    // ── end_sponsoring_future_reserves ────────────────────────────────────

    #[test]
    fn test_end_sponsorship_summary() {
        let explanation = explain_end_sponsoring_future_reserves(&base_end());
        assert!(explanation.summary.contains("GSPONSORED"));
        assert!(explanation.summary.contains("GSPONSOR"));
        assert!(explanation.summary.contains("ended"));
    }

    #[test]
    fn test_end_sponsorship_summary_format() {
        let explanation = explain_end_sponsoring_future_reserves(&base_end());
        assert!(
            explanation
                .summary
                .starts_with("GSPONSORED ended sponsorship initiated by GSPONSOR")
        );
    }

    #[test]
    fn test_end_sponsorship_fields() {
        let explanation = explain_end_sponsoring_future_reserves(&base_end());
        assert_eq!(explanation.sponsored_id, "GSPONSORED");
        assert_eq!(explanation.begin_sponsor, "GSPONSOR");
    }

    #[test]
    fn test_end_sponsorship_unknown_source() {
        let op = EndSponsoringFutureReservesOperation {
            source_account: None,
            ..base_end()
        };
        let explanation = explain_end_sponsoring_future_reserves(&op);
        assert!(explanation.summary.contains("Unknown"));
        assert_eq!(explanation.sponsored_id, "Unknown");
    }
}
