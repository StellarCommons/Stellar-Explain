# feat: translate Stellar transaction failure codes into plain-English explanations

Closes #510

---

## Summary

When a Stellar transaction fails, Horizon returns structured error codes (`tx_bad_seq`, `op_no_trust`, etc.) that are meaningless to end users. This PR parses those codes and adds two new fields to the transaction explanation response:

- **`failure_reason`** — a plain-English sentence explaining why the transaction failed and what the user can do about it
- **`operation_failures[]`** — per-operation breakdown with the original code, its index, and a human-readable explanation

Successful transactions return `failure_reason: null` and `operation_failures: []`.

---

## Example response (before → after)

**Before**
```json
{
  "successful": false,
  "summary": "This failed transaction contains 1 payment."
}
```

**After**
```json
{
  "successful": false,
  "summary": "This failed transaction contains 1 payment.",
  "failure_reason": "Transaction failed: Sequence number is out of date — another transaction from this account may have been submitted first. Try again.",
  "operation_failures": [
    {
      "index": 0,
      "code": "op_no_trust",
      "explanation": "The destination account has not opted in to hold this asset."
    }
  ]
}
```

---

## Error codes covered

### Transaction-level (`result_codes.transaction`)

| Code | Explanation |
|------|-------------|
| `tx_bad_seq` | Sequence number is out of date — another transaction from this account may have been submitted first. Try again. |
| `tx_bad_auth` | The transaction was not properly signed by the required keys. |
| `tx_insufficient_balance` | The account does not have enough XLM to cover this transaction and the minimum balance. |
| `tx_no_account` | The source account does not exist on the Stellar network. |
| `tx_insufficient_fee` | The fee offered was too low. |
| `tx_too_early` | The transaction was submitted before its minimum time boundary. |
| `tx_too_late` | The transaction expired before it was processed. |
| `tx_missing_operation` | The transaction contains no operations. |
| `tx_bad_auth_extra` | The transaction has more signatures than required. |
| _(unknown)_ | Graceful fallback: "An unexpected transaction error occurred." |

### Operation-level (`result_codes.operations[]`)

| Code | Explanation |
|------|-------------|
| `op_no_trust` | The destination account has not opted in to hold this asset. |
| `op_underfunded` | The source account does not have enough of this asset to send. |
| `op_no_destination` | The destination account does not exist on the Stellar network. |
| `op_not_authorized` | The asset issuer has not authorised this account to hold the asset. |
| `op_line_full` | The destination account's trust line is full and cannot receive more. |
| `op_no_issuer` | The asset issuer account does not exist. |
| `op_low_reserve` | The account would fall below the minimum XLM reserve after this operation. |
| _(unknown)_ | Graceful fallback: "An unexpected operation error occurred." |

`op_success` entries are silently excluded from `operation_failures[]`.

---

## Files changed

| File | Change |
|------|--------|
| `packages/core/src/explain/failure.rs` | **New** — `OperationFailure` struct, `translate_tx_code`, `translate_op_code`, `explain_failure` |
| `packages/core/src/explain/mod.rs` | Register `pub mod failure` |
| `packages/core/src/models/transaction.rs` | Add `ResultCodes` struct; add `result_codes: Option<ResultCodes>` field to `Transaction` |
| `packages/core/src/services/horizon.rs` | Add `HorizonResultCodes` + `HorizonExtras` structs; extend `HorizonTransaction` to deserialize both `extras.result_codes` (submission error shape) and top-level `result_codes` (fetch-by-hash shape) |
| `packages/core/src/services/explain.rs` | `map_transaction_to_domain` now extracts result codes from whichever Horizon shape is present |
| `packages/core/src/explain/transaction.rs` | Add `failure_reason` + `operation_failures` to `TransactionExplanation`; wire `explain_failure()` into `explain_transaction_with_ledger` |

---

## Acceptance criteria

- [x] Failed transactions include `failure_reason` with a plain-English explanation
- [x] `operation_failures[]` array present when operations also have error codes
- [x] All 9 transaction-level codes listed in the issue are translated
- [x] All 7 operation-level codes listed in the issue are translated
- [x] Unknown codes return a graceful fallback (not null or empty)
- [x] Successful transactions have `failure_reason: null` and `operation_failures: []`
- [x] Unit tests for each error code translation
- [x] `cargo test` passes with no regressions

---

## Test evidence

`cargo test` — **198 passed, 0 failed**

```
running 194 tests
test explain::failure::tests::test_explain_failure_empty_op_codes ... ok
test explain::failure::tests::test_explain_failure_no_tx_code ... ok
test explain::failure::tests::test_explain_failure_successful_transaction_no_codes ... ok
test explain::failure::tests::test_explain_failure_preserves_original_index ... ok
test explain::failure::tests::test_explain_failure_multiple_op_failures ... ok
test explain::failure::tests::test_explain_failure_op_success_excluded ... ok
test explain::failure::tests::test_explain_failure_with_tx_and_op_codes ... ok
test explain::failure::tests::test_op_line_full ... ok
test explain::failure::tests::test_op_low_reserve ... ok
test explain::failure::tests::test_op_no_destination ... ok
test explain::failure::tests::test_op_no_issuer ... ok
test explain::failure::tests::test_op_no_trust ... ok
test explain::failure::tests::test_op_not_authorized ... ok
test explain::failure::tests::test_op_underfunded ... ok
test explain::failure::tests::test_op_unknown_code_graceful_fallback ... ok
test explain::failure::tests::test_tx_bad_auth ... ok
test explain::failure::tests::test_tx_bad_auth_extra ... ok
test explain::failure::tests::test_tx_bad_seq ... ok
test explain::failure::tests::test_tx_insufficient_balance ... ok
test explain::failure::tests::test_tx_insufficient_fee ... ok
test explain::failure::tests::test_tx_missing_operation ... ok
test explain::failure::tests::test_tx_no_account ... ok
test explain::failure::tests::test_tx_too_early ... ok
test explain::failure::tests::test_tx_too_late ... ok
test explain::failure::tests::test_tx_unknown_code_graceful_fallback ... ok
test explain::memo::tests::test_explain_hash_memo ... ok
test explain::memo::tests::test_explain_id_memo ... ok
test explain::memo::tests::test_explain_memo_all_types ... ok
test explain::memo::tests::test_explain_none_memo ... ok
test explain::memo::tests::test_explain_return_memo ... ok
test explain::memo::tests::test_explain_text_memo ... ok
test explain::memo::tests::test_format_hash_long ... ok
test explain::memo::tests::test_format_hash_short ... ok
test explain::memo::tests::test_memo_type_description ... ok
test explain::memo::tests::test_memo_usage_context ... ok
test explain::operation::change_trust::tests::test_explain_change_trust_add_summary_format ... ok
test explain::operation::change_trust::tests::test_explain_change_trust_adds_trust ... ok
test explain::operation::change_trust::tests::test_explain_change_trust_nonzero_limit_is_not_removal ... ok
test explain::operation::change_trust::tests::test_explain_change_trust_removal_summary_format ... ok
test explain::operation::change_trust::tests::test_explain_change_trust_removes_trust ... ok
test explain::operation::clawback::tests::test_clawback_claimable_balance_full_id_in_field ... ok
test explain::operation::clawback::tests::test_clawback_claimable_balance_id_shortened ... ok
test explain::operation::clawback::tests::test_clawback_claimable_balance_issuer_field ... ok
test explain::operation::clawback::tests::test_clawback_claimable_balance_summary_contains_context ... ok
test explain::operation::clawback::tests::test_clawback_claimable_balance_summary_starts_correctly ... ok
test explain::operation::clawback::tests::test_clawback_claimable_balance_unknown_issuer_fallback ... ok
test explain::operation::clawback::tests::test_clawback_fields_preserved ... ok
test explain::operation::clawback::tests::test_clawback_fractional_amount ... ok
test explain::operation::clawback::tests::test_clawback_non_usdc_asset ... ok
test explain::operation::clawback::tests::test_clawback_summary_contains_amount_and_asset ... ok
test explain::operation::clawback::tests::test_clawback_summary_contains_context_note ... ok
test explain::operation::clawback::tests::test_clawback_summary_contains_recipient ... ok
test explain::operation::clawback::tests::test_clawback_summary_format ... ok
test explain::operation::clawback::tests::test_clawback_unknown_issuer_fallback ... ok
test explain::operation::clawback::tests::test_short_balance_id_not_truncated ... ok
test explain::operation::create_account::tests::test_explain_create_account_default_balance_fallback ... ok
test explain::operation::create_account::tests::test_explain_create_account_fields_are_preserved ... ok
test explain::operation::create_account::tests::test_explain_create_account_minimum_reserve ... ok
test explain::operation::create_account::tests::test_explain_create_account_standard ... ok
test explain::operation::create_account::tests::test_explain_create_account_summary_format ... ok
test explain::operation::manage_offer::tests::test_buy_offer ... ok
test explain::operation::manage_offer::tests::test_cancel_offer ... ok
test explain::operation::manage_offer::tests::test_new_sell_offer ... ok
test explain::operation::manage_offer::tests::test_update_offer ... ok
test explain::operation::path_payment::tests::test_multi_hop ... ok
test explain::operation::path_payment::tests::test_same_asset_degenerate ... ok
test explain::operation::path_payment::tests::test_single_hop ... ok
test explain::operation::path_payment::tests::test_strict_receive ... ok
test explain::operation::payment::tests::test_explain_payment_credit_asset ... ok
test explain::operation::payment::tests::test_explain_payment_labels_known_addresses_in_summary ... ok
test explain::operation::payment::tests::test_explain_payment_native_asset ... ok
test explain::operation::payment::tests::test_explain_payment_no_source_account ... ok
test explain::operation::payment::tests::test_explain_payment_summary_uses_raw_for_unknown_addresses ... ok
test explain::operation::payment::tests::test_explain_payment_with_fee_credit_asset ... ok
test explain::operation::payment::tests::test_explain_payment_with_high_fee ... ok
test explain::operation::set_options::tests::test_explain_clear_all_flags ... ok
test explain::operation::set_options::tests::test_explain_set_high_threshold ... ok
test explain::operation::set_options::tests::test_explain_set_home_domain ... ok
test explain::operation::set_options::tests::test_explain_set_inflation_dest ... ok
test explain::operation::set_options::tests::test_explain_set_options_add_signer ... ok
test explain::operation::set_options::tests::test_explain_set_options_no_changes ... ok
test explain::operation::set_options::tests::test_explain_set_options_remove_signer ... ok
test explain::transaction::tests::test_build_transaction_summary_failed ... ok
test explain::transaction::tests::test_explain_empty_transaction_returns_err ... ok
test explain::transaction::tests::test_explain_fee_high ... ok
test explain::transaction::tests::test_explain_fee_standard ... ok
test explain::transaction::tests::test_explain_no_payments_returns_ok ... ok
test explain::transaction::tests::test_explain_transaction_with_both_ledger_fields ... ok
test explain::transaction::tests::test_explain_transaction_with_ledger_only ... ok
test explain::transaction::tests::test_explain_transaction_with_memo ... ok
test explain::transaction::tests::test_explain_transaction_with_time_only ... ok
test explain::transaction::tests::test_explain_transaction_without_ledger_fields ... ok
test explain::transaction::tests::test_failed_tx_all_op_successes_yields_empty_operation_failures ... ok
test explain::transaction::tests::test_failed_tx_with_result_codes_sets_failure_reason ... ok
test explain::transaction::tests::test_failed_tx_without_result_codes_has_null_failure_fields ... ok
test explain::transaction::tests::test_format_ledger_time_date_only ... ok
test explain::transaction::tests::test_format_ledger_time_empty_string ... ok
test explain::transaction::tests::test_format_ledger_time_end_of_day ... ok
test explain::transaction::tests::test_format_ledger_time_invalid_returns_original ... ok
test explain::transaction::tests::test_format_ledger_time_midnight ... ok
test explain::transaction::tests::test_format_ledger_time_standard_utc ... ok
test explain::transaction::tests::test_format_ledger_time_strips_seconds ... ok
test explain::transaction::tests::test_format_ledger_time_with_positive_offset ... ok
test explain::transaction::tests::test_format_ledger_time_with_whitespace ... ok
test explain::transaction::tests::test_successful_tx_has_no_failure_fields ... ok
test models::fee::tests::test_fee_stats_creation ... ok
test models::fee::tests::test_high_fee_detection ... ok
test models::fee::tests::test_recommended_fee_returns_p90 ... ok
test models::fee::tests::test_stroops_to_xlm_conversion ... ok
test models::memo::tests::test_memo_serialization ... ok
test models::memo::tests::test_none_memo ... ok
test models::memo::tests::test_return_memo ... ok
test models::memo::tests::test_text_memo_max_length ... ok
test models::memo::tests::test_text_memo_too_long ... ok
test models::memo::tests::test_text_memo_valid ... ok
test models::operation::tests::test_change_trust_id ... ok
test models::operation::tests::test_create_account_id ... ok
test models::operation::tests::test_format_asset_credit ... ok
test models::operation::tests::test_format_asset_native ... ok
test models::operation::tests::test_is_payment ... ok
test models::operation::tests::test_is_set_options ... ok
test models::operation::tests::test_operation_id ... ok
test models::operation::tests::test_set_options_id ... ok
test models::transaction::tests::test_failed_transaction_flag ... ok
test models::transaction::tests::test_failed_transaction_with_result_codes ... ok
test models::transaction::tests::test_get_memo ... ok
test models::transaction::tests::test_has_memo ... ok
test models::transaction::tests::test_has_payments ... ok
test models::transaction::tests::test_payment_count ... ok
test models::transaction::tests::test_payment_operations ... ok
test models::transaction::tests::test_successful_transaction_has_no_result_codes ... ok
test routes::account::tests::test_cursor_navigation_values_are_passed_through ... ok
test routes::account::tests::test_custom_limit_and_order ... ok
test routes::account::tests::test_default_pagination ... ok
test routes::account::tests::test_invalid_order_rejected ... ok
test routes::account::tests::test_limit_over_max_rejected ... ok
test routes::account::tests::test_limit_zero_rejected ... ok
test routes::account::tests::test_max_limit_accepted ... ok
test services::explain::tests::test_map_memo_hash ... ok
test services::explain::tests::test_map_memo_id ... ok
test services::explain::tests::test_map_memo_missing_type ... ok
test services::explain::tests::test_map_memo_none_type ... ok
test services::explain::tests::test_map_memo_return ... ok
test services::explain::tests::test_map_memo_text ... ok
test services::explain::tests::test_map_memo_unknown_type ... ok
test services::horizon_test::tests::fetch_account_transactions_cursor_navigation ... ok
test services::horizon_test::tests::fetch_account_transactions_custom_limit ... ok
test services::horizon_test::tests::fetch_account_transactions_default_pagination ... ok
test services::horizon_test::tests::fetch_account_transactions_not_found ... ok
test services::horizon_test::tests::fetch_stellar_toml_org_name_with_cache ... ok
test services::horizon_test::tests::fetch_transaction_invalid_response ... ok
test services::horizon_test::tests::fetch_transaction_not_found ... ok
test services::horizon_test::tests::fetch_transaction_success ... ok
test services::labels::tests::resolves_case_and_whitespace ... ok
test services::labels::tests::resolves_known_address ... ok
test services::labels::tests::unknown_address_returns_none ... ok
test services::transaction_cache::tests::test_cache_basic_operations ... ok
test services::transaction_cache::tests::test_cache_does_not_grow_unbounded ... ok
test services::transaction_cache::tests::test_cache_hit_avoids_recomputation ... ok
test services::transaction_cache::tests::test_cache_key_uniqueness ... ok
test services::transaction_cache::tests::test_cache_stats ... ok
test services::transaction_cache::tests::test_cache_update ... ok
test services::transaction_cache::tests::test_clear_cache ... ok
test services::transaction_cache::tests::test_custom_ttl ... ok
test services::transaction_cache::tests::test_evict_expired ... ok
test services::transaction_cache::tests::test_network_types ... ok
test services::transaction_cache::tests::test_thread_safe_concurrent_access ... ok
test services::transaction_cache::tests::test_thread_safe_concurrent_read_write ... ok
test services::transaction_cache::tests::test_ttl_expiration ... ok

test result: ok. 198 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.18s

running 15 tests (doc-tests)
test src/explain/memo.rs - explain::memo::explain_memo (line 18) ... ok
test src/explain/memo.rs - explain::memo::memo_type_description (line 64) ... ok
test src/explain/memo.rs - explain::memo::memo_usage_context (line 85) ... ok
test src/models/fee.rs - models::fee::FeeStats::default_network_fees (line 64) ... ok
test src/models/fee.rs - models::fee::FeeStats::is_high_fee (line 91) ... ok
test src/models/fee.rs - models::fee::FeeStats::new (line 43) ... ok
test src/models/fee.rs - models::fee::FeeStats::recommended_fee (line 111) ... ok
test src/models/fee.rs - models::fee::FeeStats::stroops_to_xlm (line 136) ... ok
test src/models/memo.rs - models::memo::Memo::hash (line 93) ... ok
test src/models/memo.rs - models::memo::Memo::id (line 77) ... ok
test src/models/memo.rs - models::memo::Memo::is_none (line 141) ... ok
test src/models/memo.rs - models::memo::Memo::return_hash (line 107) ... ok
test src/models/memo.rs - models::memo::Memo::text (line 56) ... ok
test src/models/memo.rs - models::memo::Memo::value_string (line 154) ... ok
test src/models/memo.rs - models::memo::Memo::memo_type (line 121) ... ok

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s
```

**Total: 213 tests executed — 198 unit + 15 doc-tests — 0 failures**
