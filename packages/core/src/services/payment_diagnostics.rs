//! Read-only payment pre-flight diagnostics.
//!
//! Given a [`PaymentIntent`] and a [`HorizonClient`], this module checks whether
//! the proposed payment is likely to succeed based on the *current* on-chain state.
//!
//! **This is a diagnostic, not a guarantee.** On-chain state can change between a
//! pre-flight check and an eventual submission — this function does not promise
//! a payment will succeed, only that based on what Horizon reports right now,
//! these specific conditions would likely prevent or complicate it.
//!
//! The function makes no write requests to Horizon and requires no signature or
//! key material anywhere in its call path.

use tokio::join;

use crate::errors::HorizonError;
use crate::models::payment_intent::PaymentIntent;
use crate::models::stellar::Asset;
use crate::services::horizon::HorizonClient;

/// Severity of a pre-flight issue.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PreflightSeverity {
    /// The payment will almost certainly fail with this condition.
    Blocker,
    /// The payment may fail or behave unexpectedly.
    Warning,
}

/// A single pre-flight issue discovered during diagnostics.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PreflightIssue {
    pub severity: PreflightSeverity,
    /// Machine-readable code, reusing `op_*` vocabulary where a condition
    /// genuinely matches a post-hoc failure code.
    pub code: &'static str,
    pub message: String,
}

/// Compute the minimum XLM balance reserve for an account.
///
/// `minimum_reserve = (2 + subentry_count + num_sponsoring - num_sponsored) × base_reserve`
///
/// The `2` accounts for the base reserve entries (account + first trustline).
fn minimum_reserve(
    subentry_count: u32,
    num_sponsoring: u32,
    num_sponsored: u32,
    base_reserve: u64,
) -> u64 {
    let entries = 2u64
        .saturating_add(subentry_count as u64)
        .saturating_add(num_sponsoring as u64)
        .saturating_sub(num_sponsored as u64);
    entries.saturating_mul(base_reserve)
}

/// Run pre-flight diagnostics on a [`PaymentIntent`].
///
/// Returns a `Vec<PreflightIssue>` — an empty vec means no known issue was found.
/// Issues are ordered by severity (blockers first), then by check order.
///
/// This function is read-only: it only calls `fetch_account` and
/// `fetch_ledger_base_reserve` on Horizon.
pub async fn preflight(intent: &PaymentIntent, client: &HorizonClient) -> Vec<PreflightIssue> {
    let mut issues = Vec::new();

    // Fetch source account, destination account, and base reserve in parallel
    let (src_result, dst_result, base_reserve_opt) = join!(
        client.fetch_account(intent.source.as_str()),
        client.fetch_account(intent.destination.as_str()),
        client.fetch_ledger_base_reserve(),
    );

    // ── Destination existence ──────────────────────────────────────────────
    let dst_account = match dst_result {
        Ok(account) => account,
        Err(HorizonError::AccountNotFound) => {
            issues.push(PreflightIssue {
                severity: PreflightSeverity::Blocker,
                code: "op_no_destination",
                message: "Destination account does not exist on the Stellar network.".to_string(),
            });
            return issues;
        }
        Err(_) => return issues,
    };

    // ── Source account ─────────────────────────────────────────────────────
    let src_account = src_result.ok();

    let amount_stroops = intent.amount.stroops();

    // ── Source balance and reserve checks ──────────────────────────────────
    if let Some(ref src) = src_account {
        match intent.asset {
            Asset::Native => {
                let src_xlm_balance = src
                    .balances
                    .iter()
                    .find(|b| b.asset_type == "native")
                    .and_then(|b| b.balance.parse::<u64>().ok());

                if let Some(balance) = src_xlm_balance {
                    if balance < amount_stroops {
                        issues.push(PreflightIssue {
                            severity: PreflightSeverity::Blocker,
                            code: "op_underfunded",
                            message: format!(
                                "Source account has {balance} stroops of XLM but needs \
                                 {amount_stroops} for this payment.",
                            ),
                        });
                    }

                    if let Some(base_reserve) = base_reserve_opt {
                        let reserve = minimum_reserve(
                            src.subentry_count,
                            src.num_sponsoring,
                            src.num_sponsored,
                            base_reserve,
                        );
                        let available = balance.saturating_sub(amount_stroops);
                        if available < reserve {
                            issues.push(PreflightIssue {
                                severity: PreflightSeverity::Blocker,
                                code: "op_low_reserve",
                                message: format!(
                                    "After this payment, the source account would have \
                                     {available} stroops available, but needs {reserve} \
                                     stroops to meet the minimum reserve.",
                                ),
                            });
                        }
                    }
                }
            }
            Asset::Credit {
                ref code,
                ref issuer,
            } => {
                let src_asset_balance = src
                    .balances
                    .iter()
                    .find(|b| {
                        b.asset_code.as_deref() == Some(code)
                            && b.asset_issuer.as_deref() == Some(issuer.as_str())
                    })
                    .and_then(|b| b.balance.parse::<u64>().ok());

                match src_asset_balance {
                    Some(balance) if balance < amount_stroops => {
                        issues.push(PreflightIssue {
                            severity: PreflightSeverity::Blocker,
                            code: "op_underfunded",
                            message: format!(
                                "Source account has {balance} stroops of {code} but needs \
                                 {amount_stroops} for this payment.",
                            ),
                        });
                    }
                    None => {
                        issues.push(PreflightIssue {
                            severity: PreflightSeverity::Blocker,
                            code: "op_underfunded",
                            message: format!("Source account does not hold any {code}."),
                        });
                    }
                    _ => {}
                }
            }
        }
    }

    // ── Trustline checks (non-native assets, destination side) ─────────────
    if let Asset::Credit {
        ref code,
        ref issuer,
    } = intent.asset
    {
        let has_trustline = dst_account.balances.iter().any(|b| {
            b.asset_code.as_deref() == Some(code)
                && b.asset_issuer.as_deref() == Some(issuer.as_str())
        });

        if !has_trustline {
            issues.push(PreflightIssue {
                severity: PreflightSeverity::Blocker,
                code: "op_no_trust",
                message: format!("Destination account has not opted in to hold {code}."),
            });
            return issues;
        }

        if dst_account.flags.auth_required {
            let trustline_authorized = dst_account.balances.iter().any(|b| {
                b.asset_code.as_deref() == Some(code)
                    && b.asset_issuer.as_deref() == Some(issuer.as_str())
                    && b.is_authorized
            });

            if !trustline_authorized {
                issues.push(PreflightIssue {
                    severity: PreflightSeverity::Blocker,
                    code: "op_not_authorized",
                    message: format!(
                        "The asset issuer requires authorization, but the destination's \
                         trustline for {code} is not authorised."
                    ),
                });
            }
        }
    }

    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_minimum_reserve_basic() {
        assert_eq!(minimum_reserve(0, 0, 0, 100_000_000), 200_000_000);
    }

    #[test]
    fn test_minimum_reserve_with_subentries() {
        assert_eq!(minimum_reserve(5, 0, 0, 100_000_000), 700_000_000);
    }

    #[test]
    fn test_minimum_reserve_with_sponsorship() {
        assert_eq!(minimum_reserve(3, 2, 1, 100_000_000), 600_000_000);
    }

    #[test]
    fn test_minimum_reserve_saturating_sub() {
        // (2 + 0 + 0 - 5) saturates entries to 0, then × base_reserve = 0
        assert_eq!(minimum_reserve(0, 0, 5, 100_000_000), 0);
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;
    use crate::models::stellar::{Amount, Asset, StellarAddress};
    use crate::services::horizon::HorizonClient;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    /// Helper: build a valid SEP-23 Ed25519 address from seed bytes.
    fn make_addr(seed: u8) -> StellarAddress {
        let mut payload = vec![0x30u8]; // version byte
        payload.extend(std::iter::repeat_n(seed, 32));
        let checksum = crc16_xmodem(&payload);
        // Append checksum little-endian
        payload.push((checksum & 0xFF) as u8);
        payload.push((checksum >> 8) as u8);
        base32_encode(&payload).parse().unwrap()
    }

    fn crc16_xmodem(data: &[u8]) -> u16 {
        let mut crc: u16 = 0;
        for &byte in data {
            crc ^= (byte as u16) << 8;
            for _ in 0..8 {
                if crc & 0x8000 != 0 {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc <<= 1;
                }
            }
        }
        crc
    }

    fn base32_encode(data: &[u8]) -> String {
        const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let mut result = String::new();
        let mut buffer: u32 = 0;
        let mut bits_left: i32 = 0;
        for &byte in data {
            buffer = (buffer << 8) | (byte as u32);
            bits_left += 8;
            while bits_left >= 5 {
                bits_left -= 5;
                result.push(ALPHABET[((buffer >> bits_left) & 0x1F) as usize] as char);
            }
        }
        if bits_left > 0 {
            result.push(ALPHABET[((buffer << (5 - bits_left)) & 0x1F) as usize] as char);
        }
        result
    }

    #[allow(clippy::too_many_arguments)]
    fn mock_account_json(
        address: &StellarAddress,
        xlm_balance: &str,
        asset_code: Option<&str>,
        asset_issuer: Option<&StellarAddress>,
        asset_balance: Option<&str>,
        is_authorized: bool,
        auth_required: bool,
        subentry_count: u32,
        num_sponsoring: u32,
        num_sponsored: u32,
    ) -> serde_json::Value {
        let mut balances = vec![serde_json::json!({
            "asset_type": "native",
            "balance": xlm_balance,
        })];
        if let (Some(code), Some(issuer), Some(balance)) = (asset_code, asset_issuer, asset_balance)
        {
            balances.push(serde_json::json!({
                "asset_type": "credit_alphanum4",
                "asset_code": code,
                "asset_issuer": issuer.as_str(),
                "balance": balance,
                "is_authorized": is_authorized,
            }));
        }
        serde_json::json!({
            "id": address.as_str(),
            "account_id": address.as_str(),
            "sequence": "1000000000000000000",
            "balances": balances,
            "signers": [{"weight": 1}],
            "flags": {
                "auth_required": auth_required,
                "auth_revocable": false,
                "auth_immutable": false,
                "auth_clawback_enabled": false,
            },
            "home_domain": "",
            "subentry_count": subentry_count,
            "num_sponsoring": num_sponsoring,
            "num_sponsored": num_sponsored,
        })
    }

    fn mock_ledger_json(base_reserve: u64) -> serde_json::Value {
        serde_json::json!({
            "_embedded": {
                "records": [{
                    "base_reserve_in_stroops": base_reserve.to_string()
                }]
            }
        })
    }

    #[tokio::test]
    async fn destination_not_found_produces_blocker() {
        let server = MockServer::start().await;
        let src_addr = make_addr(0x01);
        let dst_addr = make_addr(0x02);

        // Destination returns 404
        Mock::given(method("GET"))
            .and(path(format!("/accounts/{dst_addr}")))
            .respond_with(ResponseTemplate::new(404))
            .mount(&server)
            .await;

        let intent = PaymentIntent::try_new(
            src_addr,
            dst_addr,
            Asset::Native,
            Amount::from_stroops(1_000_000).unwrap(),
            None,
        )
        .unwrap();

        let client = HorizonClient::new(server.uri());
        let issues = preflight(&intent, &client).await;

        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].severity, PreflightSeverity::Blocker);
        assert_eq!(issues[0].code, "op_no_destination");
    }

    #[tokio::test]
    async fn no_trustline_for_non_native_asset_produces_blocker() {
        let server = MockServer::start().await;
        let src_addr = make_addr(0x01);
        let dst_addr = make_addr(0x02);
        let issuer_addr = make_addr(0x03);

        // Source exists with XLM balance
        Mock::given(method("GET"))
            .and(path(format!("/accounts/{src_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &src_addr,
                "1000000000",
                None,
                None,
                None,
                true,
                false,
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        // Destination exists but has no trustline for USDC
        Mock::given(method("GET"))
            .and(path(format!("/accounts/{dst_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &dst_addr,
                "500000000",
                None,
                None,
                None,
                true,
                false,
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        // Ledger not needed for non-native trustline check
        Mock::given(method("GET"))
            .and(path("/ledgers"))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_ledger_json(100_000_000)))
            .mount(&server)
            .await;

        let asset = Asset::Credit {
            code: "USDC".to_string(),
            issuer: issuer_addr,
        };
        let intent = PaymentIntent::try_new(
            src_addr,
            dst_addr,
            asset,
            Amount::from_stroops(1_000_000).unwrap(),
            None,
        )
        .unwrap();

        let client = HorizonClient::new(server.uri());
        let issues = preflight(&intent, &client).await;

        assert!(issues.iter().any(|i| i.code == "op_no_trust"));
        let no_trust = issues.iter().find(|i| i.code == "op_no_trust").unwrap();
        assert_eq!(no_trust.severity, PreflightSeverity::Blocker);
    }

    #[tokio::test]
    async fn unauthorized_trustline_produces_blocker() {
        let server = MockServer::start().await;
        let src_addr = make_addr(0x01);
        let dst_addr = make_addr(0x02);
        let issuer_addr = make_addr(0x03);

        Mock::given(method("GET"))
            .and(path(format!("/accounts/{src_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &src_addr,
                "1000000000",
                None,
                None,
                None,
                true,
                false,
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        // Destination has trustline but is NOT authorized, issuer requires auth
        Mock::given(method("GET"))
            .and(path(format!("/accounts/{dst_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &dst_addr,
                "500000000",
                Some("USDC"),
                Some(&issuer_addr),
                Some("1000000000"),
                false, // is_authorized = false
                true,  // auth_required = true
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path("/ledgers"))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_ledger_json(100_000_000)))
            .mount(&server)
            .await;

        let asset = Asset::Credit {
            code: "USDC".to_string(),
            issuer: issuer_addr,
        };
        let intent = PaymentIntent::try_new(
            src_addr,
            dst_addr,
            asset,
            Amount::from_stroops(1_000_000).unwrap(),
            None,
        )
        .unwrap();

        let client = HorizonClient::new(server.uri());
        let issues = preflight(&intent, &client).await;

        assert!(issues.iter().any(|i| i.code == "op_not_authorized"));
        let not_auth = issues
            .iter()
            .find(|i| i.code == "op_not_authorized")
            .unwrap();
        assert_eq!(not_auth.severity, PreflightSeverity::Blocker);
    }

    #[tokio::test]
    async fn insufficient_xlm_balance_produces_blocker() {
        let server = MockServer::start().await;
        let src_addr = make_addr(0x01);
        let dst_addr = make_addr(0x02);

        // Source has only 0.5 XLM (50_000_000 stroops)
        Mock::given(method("GET"))
            .and(path(format!("/accounts/{src_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &src_addr, "50000000", None, None, None, true, false, 0, 0, 0,
            )))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path(format!("/accounts/{dst_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &dst_addr,
                "500000000",
                None,
                None,
                None,
                true,
                false,
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path("/ledgers"))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_ledger_json(100_000_000)))
            .mount(&server)
            .await;

        // Try to send 1 XLM (10_000_000 stroops) — more than balance
        let intent = PaymentIntent::try_new(
            src_addr,
            dst_addr,
            Asset::Native,
            Amount::from_stroops(100_000_000).unwrap(),
            None,
        )
        .unwrap();

        let client = HorizonClient::new(server.uri());
        let issues = preflight(&intent, &client).await;

        assert!(issues.iter().any(|i| i.code == "op_underfunded"));
    }

    #[tokio::test]
    async fn low_reserve_produces_blocker() {
        let server = MockServer::start().await;
        let src_addr = make_addr(0x01);
        let dst_addr = make_addr(0x02);

        // Source has 3 XLM (30_000_000 stroops), 10 subentries, base_reserve = 1 XLM
        // Minimum reserve = (2 + 10) × 100_000_000 = 1_200_000_000
        // Sending 2.9 XLM leaves 1_000_000 stroops — below reserve
        Mock::given(method("GET"))
            .and(path(format!("/accounts/{src_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &src_addr, "30000000", None, None, None, true, false, 10, 0, 0,
            )))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path(format!("/accounts/{dst_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &dst_addr,
                "500000000",
                None,
                None,
                None,
                true,
                false,
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path("/ledgers"))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_ledger_json(100_000_000)))
            .mount(&server)
            .await;

        let intent = PaymentIntent::try_new(
            src_addr,
            dst_addr,
            Asset::Native,
            Amount::from_stroops(290_000_000).unwrap(),
            None,
        )
        .unwrap();

        let client = HorizonClient::new(server.uri());
        let issues = preflight(&intent, &client).await;

        assert!(issues.iter().any(|i| i.code == "op_low_reserve"));
        let low_reserve = issues.iter().find(|i| i.code == "op_low_reserve").unwrap();
        assert_eq!(low_reserve.severity, PreflightSeverity::Blocker);
    }

    #[tokio::test]
    async fn base_reserve_read_from_ledger_not_hardcoded() {
        let server = MockServer::start().await;
        let src_addr = make_addr(0x01);
        let dst_addr = make_addr(0x02);

        // With base_reserve = 2 XLM (200_000_000), minimum reserve = 2 × 200_000_000 = 400_000_000
        // Source has 5 XLM, sending 2 XLM leaves 3 XLM — above 4 XLM reserve
        Mock::given(method("GET"))
            .and(path(format!("/accounts/{src_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &src_addr,
                "500000000",
                None,
                None,
                None,
                true,
                false,
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path(format!("/accounts/{dst_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &dst_addr,
                "500000000",
                None,
                None,
                None,
                true,
                false,
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        // Return base_reserve = 2 XLM
        Mock::given(method("GET"))
            .and(path("/ledgers"))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_ledger_json(200_000_000)))
            .mount(&server)
            .await;

        let intent = PaymentIntent::try_new(
            src_addr,
            dst_addr,
            Asset::Native,
            Amount::from_stroops(200_000_000).unwrap(),
            None,
        )
        .unwrap();

        let client = HorizonClient::new(server.uri());
        let issues = preflight(&intent, &client).await;

        // Should NOT have op_low_reserve because 300_000_000 > 400_000_000 is false
        // Actually 300M < 400M — so it WOULD fail. Let me recalculate:
        // Source: 500M, send 200M, leaves 300M. Reserve = (2+0) × 200M = 400M. 300M < 400M.
        // So this SHOULD produce op_low_reserve.
        assert!(
            issues.iter().any(|i| i.code == "op_low_reserve"),
            "Expected op_low_reserve with base_reserve=200M, got: {issues:?}"
        );
    }

    #[tokio::test]
    async fn valid_intent_returns_empty_vec() {
        let server = MockServer::start().await;
        let src_addr = make_addr(0x01);
        let dst_addr = make_addr(0x02);

        Mock::given(method("GET"))
            .and(path(format!("/accounts/{src_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &src_addr,
                "10000000000",
                None,
                None,
                None,
                true,
                false,
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path(format!("/accounts/{dst_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &dst_addr,
                "5000000000",
                None,
                None,
                None,
                true,
                false,
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path("/ledgers"))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_ledger_json(100_000_000)))
            .mount(&server)
            .await;

        let intent = PaymentIntent::try_new(
            src_addr,
            dst_addr,
            Asset::Native,
            Amount::from_stroops(1_000_000).unwrap(),
            None,
        )
        .unwrap();

        let client = HorizonClient::new(server.uri());
        let issues = preflight(&intent, &client).await;

        assert!(issues.is_empty(), "Expected no issues, got: {issues:?}");
    }

    #[tokio::test]
    async fn no_reserve_check_for_non_native_asset() {
        let server = MockServer::start().await;
        let src_addr = make_addr(0x01);
        let dst_addr = make_addr(0x02);
        let issuer_addr = make_addr(0x03);

        // Source has USDC trustline with 1000 USDC
        Mock::given(method("GET"))
            .and(path(format!("/accounts/{src_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &src_addr,
                "1000000000",
                Some("USDC"),
                Some(&issuer_addr),
                Some("100000000000"),
                true,
                false,
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        // Destination has USDC trustline with enough balance
        Mock::given(method("GET"))
            .and(path(format!("/accounts/{dst_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &dst_addr,
                "100000000",
                Some("USDC"),
                Some(&issuer_addr),
                Some("50000000000"),
                true,
                false,
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path("/ledgers"))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_ledger_json(100_000_000)))
            .mount(&server)
            .await;

        let asset = Asset::Credit {
            code: "USDC".to_string(),
            issuer: issuer_addr,
        };
        let intent = PaymentIntent::try_new(
            src_addr,
            dst_addr,
            asset,
            Amount::from_stroops(1_000_000).unwrap(),
            None,
        )
        .unwrap();

        let client = HorizonClient::new(server.uri());
        let issues = preflight(&intent, &client).await;

        // No reserve-related issues for non-native assets
        assert!(
            !issues.iter().any(|i| i.code == "op_low_reserve"),
            "Should not have op_low_reserve for non-native asset"
        );
        assert!(issues.is_empty());
    }

    #[tokio::test]
    async fn combined_multi_issue_scenario() {
        let server = MockServer::start().await;
        let src_addr = make_addr(0x01);
        let dst_addr = make_addr(0x02);
        let issuer_addr = make_addr(0x03);

        // Source has 0.5 XLM — not enough to send 1 XLM
        Mock::given(method("GET"))
            .and(path(format!("/accounts/{src_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &src_addr, "50000000", None, None, None, true, false, 0, 0, 0,
            )))
            .mount(&server)
            .await;

        // Destination has no USDC trustline
        Mock::given(method("GET"))
            .and(path(format!("/accounts/{dst_addr}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_account_json(
                &dst_addr,
                "500000000",
                None,
                None,
                None,
                true,
                false,
                0,
                0,
                0,
            )))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path("/ledgers"))
            .respond_with(ResponseTemplate::new(200).set_body_json(mock_ledger_json(100_000_000)))
            .mount(&server)
            .await;

        // Source doesn't hold USDC either
        let asset = Asset::Credit {
            code: "USDC".to_string(),
            issuer: issuer_addr,
        };
        let intent = PaymentIntent::try_new(
            src_addr,
            dst_addr,
            asset,
            Amount::from_stroops(1_000_000).unwrap(),
            None,
        )
        .unwrap();

        let client = HorizonClient::new(server.uri());
        let issues = preflight(&intent, &client).await;

        // Should have: op_no_trust (destination) + op_underfunded (source)
        assert!(
            issues.iter().any(|i| i.code == "op_no_trust"),
            "Expected op_no_trust, got: {issues:?}"
        );
        assert!(
            issues.iter().any(|i| i.code == "op_underfunded"),
            "Expected op_underfunded, got: {issues:?}"
        );
    }
}
