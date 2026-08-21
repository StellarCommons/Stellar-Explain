use std::{sync::Arc, time::Duration};

use axum::{Router, middleware, routing::get};
use reqwest::StatusCode;
use serde_json::{Value, json};
use stellar_explain_core::{
    middleware::request_id::request_id_middleware,
    routes::{
        account::{get_account_explanation, get_account_transactions},
        tx::get_tx_explanation,
    },
    services::horizon::HorizonClient,
};
use tokio::net::TcpListener;
use wiremock::{
    Mock, MockServer, ResponseTemplate,
    matchers::{method, path},
};

fn test_hash(seed: char) -> String {
    std::iter::repeat_n(seed, 64).collect()
}

async fn spawn_app(horizon_base_url: &str) -> String {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("failed to bind ephemeral port");
    let addr = listener.local_addr().expect("failed to read local addr");

    let app = Router::new()
        .route("/tx/:hash", get(get_tx_explanation))
        .route("/account/:address", get(get_account_explanation))
        .route("/account/:address/history", get(get_account_transactions))
        .with_state(Arc::new(HorizonClient::new(horizon_base_url.to_string())))
        .layer(middleware::from_fn(request_id_middleware));

    tokio::spawn(async move {
        axum::serve(listener, app)
            .await
            .expect("server failed unexpectedly");
    });

    // Small delay to avoid request race with startup.
    tokio::time::sleep(Duration::from_millis(40)).await;

    format!("http://{addr}")
}

async fn mock_fee_stats(server: &MockServer) {
    Mock::given(method("GET"))
        .and(path("/fee_stats"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "last_ledger_base_fee": "100",
            "fee_charged": {
                "min": "100",
                "max": "1000",
                "mode": "100",
                "p90": "250"
            }
        })))
        .mount(server)
        .await;
}

async fn mock_transaction(
    server: &MockServer,
    hash: &str,
    successful: bool,
    fee_charged: &str,
    memo_type: Option<&str>,
    memo: Option<&str>,
) {
    Mock::given(method("GET"))
        .and(path(format!("/transactions/{hash}")))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "hash": hash,
            "successful": successful,
            "fee_charged": fee_charged,
            "memo_type": memo_type,
            "memo": memo,
        })))
        .mount(server)
        .await;
}

async fn mock_operations(server: &MockServer, hash: &str, operations: Value) {
    Mock::given(method("GET"))
        .and(path(format!("/transactions/{hash}/operations")))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "_embedded": {
                "records": operations,
            }
        })))
        .mount(server)
        .await;
}

#[tokio::test]
async fn successful_payment_transaction_returns_transaction_explanation_json() {
    let horizon_mock = MockServer::start().await;
    let hash = test_hash('a');

    mock_fee_stats(&horizon_mock).await;
    mock_transaction(&horizon_mock, &hash, true, "100", Some("none"), None).await;
    mock_operations(
        &horizon_mock,
        &hash,
        json!([
            {
                "id": "123456789",
                "transaction_hash": hash.clone(),
                "type": "payment",
                "from": "GCOINBASEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                "to": "GBINANCEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                "asset_type": "native",
                "amount": "500.0000000"
            }
        ]),
    )
    .await;

    let app_url = spawn_app(&horizon_mock.uri()).await;
    let response = reqwest::get(format!("{app_url}/tx/{hash}"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let payload: Value = response.json().await.expect("json parse failed");
    assert_eq!(payload["transaction_hash"], hash);
    assert_eq!(payload["successful"], true);
    assert!(
        payload["summary"]
            .as_str()
            .unwrap_or_default()
            .contains("payment")
    );
    assert_eq!(payload["payment_explanations"][0]["amount"], "500.0000000");
    assert!(
        payload["payment_explanations"][0]["summary"]
            .as_str()
            .unwrap_or_default()
            .contains("Coinbase")
    );
}

#[tokio::test]
async fn transaction_with_memo_returns_memo_explanation() {
    let horizon_mock = MockServer::start().await;
    let hash = test_hash('b');

    mock_fee_stats(&horizon_mock).await;
    mock_transaction(
        &horizon_mock,
        &hash,
        true,
        "100",
        Some("text"),
        Some("Invoice #2026"),
    )
    .await;
    mock_operations(
        &horizon_mock,
        &hash,
        json!([
            {
                "id": "555555",
                "transaction_hash": hash.clone(),
                "type": "payment",
                "from": "GSENDERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                "to": "GRECIPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                "asset_type": "native",
                "amount": "42.0000000"
            }
        ]),
    )
    .await;

    let app_url = spawn_app(&horizon_mock.uri()).await;
    let response = reqwest::get(format!("{app_url}/tx/{hash}"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let payload: Value = response.json().await.expect("json parse failed");
    let memo_explanation = payload["memo_explanation"].as_str().unwrap_or_default();
    assert!(memo_explanation.contains("Invoice #2026"));
}

#[tokio::test]
async fn non_existent_transaction_hash_returns_404_json_error() {
    let horizon_mock = MockServer::start().await;
    let hash = test_hash('c');

    Mock::given(method("GET"))
        .and(path(format!("/transactions/{hash}")))
        .respond_with(ResponseTemplate::new(404))
        .mount(&horizon_mock)
        .await;

    Mock::given(method("GET"))
        .and(path(format!("/transactions/{hash}/operations")))
        .respond_with(ResponseTemplate::new(404))
        .mount(&horizon_mock)
        .await;

    let app_url = spawn_app(&horizon_mock.uri()).await;
    let response = reqwest::get(format!("{app_url}/tx/{hash}"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    let payload: Value = response.json().await.expect("json parse failed");
    assert_eq!(payload["error"]["code"], "NOT_FOUND");
}

#[tokio::test]
#[ignore = "Enable once /tx includes create_account operation explanations (Issue #11)."]
async fn create_account_transaction_returns_create_account_explanation() {
    let horizon_mock = MockServer::start().await;
    let hash = test_hash('d');

    mock_fee_stats(&horizon_mock).await;
    mock_transaction(&horizon_mock, &hash, true, "100", Some("none"), None).await;
    mock_operations(
        &horizon_mock,
        &hash,
        json!([
            {
                "id": "777777",
                "transaction_hash": hash.clone(),
                "type": "create_account",
                "funder": "GFUNDERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                "account": "GNEWACCOUNTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                "starting_balance": "2.5000000"
            }
        ]),
    )
    .await;

    let app_url = spawn_app(&horizon_mock.uri()).await;
    let response = reqwest::get(format!("{app_url}/tx/{hash}"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let payload: Value = response.json().await.expect("json parse failed");
    let create_account = payload["create_account_explanations"][0]["summary"]
        .as_str()
        .unwrap_or_default();
    assert!(create_account.contains("created account"));
}

#[tokio::test]
async fn invalid_hash_format_returns_400_json_error() {
    let horizon_mock = MockServer::start().await;
    let app_url = spawn_app(&horizon_mock.uri()).await;

    let response = reqwest::get(format!("{app_url}/tx/not-a-valid-stellar-hash"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let payload: Value = response.json().await.expect("json parse failed");
    assert_eq!(payload["error"]["code"], "BAD_REQUEST");
}

#[tokio::test]
async fn malformed_account_address_returns_400_without_horizon_call() {
    let horizon_mock = MockServer::start().await;

    // No Horizon mock mounted — if the request reaches Horizon it would 404,
    // proving the validation short-circuits before any external call.

    let app_url = spawn_app(&horizon_mock.uri()).await;
    let response = reqwest::get(format!("{app_url}/account/not-a-valid-address"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let payload: Value = response.json().await.expect("json parse failed");
    // After #867, malformed addresses carry a stable validation code
    // instead of the ad-hoc "BAD_REQUEST". The response envelope shape
    // ({ "error": { "code": ..., "message": ... } }) is unchanged.
    assert_eq!(payload["error"]["code"], "INVALID_ADDRESS_LENGTH");
    assert!(
        payload["error"]["message"]
            .as_str()
            .unwrap_or_default()
            .contains("Invalid Stellar address")
    );
}

fn valid_stellar_address() -> String {
    "GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H".to_string()
}

async fn mock_account_transactions(
    server: &MockServer,
    address: &str,
    records: Value,
    next_cursor: Option<&str>,
) {
    let base = server.uri();
    let next_href = next_cursor
        .map(|c| format!("{base}/accounts/{address}/transactions?cursor={c}&limit=10&order=desc"))
        .unwrap_or_default();
    let prev_href =
        format!("{base}/accounts/{address}/transactions?cursor=PREV&limit=10&order=desc");

    Mock::given(method("GET"))
        .and(path(format!("/accounts/{address}/transactions")))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "_links": {
                "next": if next_cursor.is_some() {
                    json!({ "href": next_href })
                } else {
                    json!(null)
                },
                "prev": { "href": prev_href }
            },
            "_embedded": {
                "records": records
            }
        })))
        .mount(server)
        .await;
}

/// Like `mock_account_transactions` but always includes a non-null `_links.next`
/// with the given cursor, regardless of whether next_cursor is Some/None.
/// Used to test that `has_more` is derived from record count, not link presence.
async fn mock_account_transactions_with_next(
    server: &MockServer,
    address: &str,
    records: Value,
    cursor_token: &str,
) {
    let base = server.uri();
    let next_href =
        format!("{base}/accounts/{address}/transactions?cursor={cursor_token}&limit=10&order=desc");
    let prev_href =
        format!("{base}/accounts/{address}/transactions?cursor=PREV&limit=10&order=desc");

    Mock::given(method("GET"))
        .and(path(format!("/accounts/{address}/transactions")))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "_links": {
                "next": { "href": next_href },
                "prev": { "href": prev_href }
            },
            "_embedded": {
                "records": records
            }
        })))
        .mount(server)
        .await;
}

#[tokio::test]
async fn account_history_returns_frontend_contract_shape() {
    let horizon_mock = MockServer::start().await;
    let address = valid_stellar_address();

    mock_fee_stats(&horizon_mock).await;
    mock_account_transactions(
        &horizon_mock,
        &address,
        json!([
            {
                "hash": "abc123def456",
                "successful": true,
                "created_at": "2024-06-15T10:30:00Z",
                "source_account": address,
                "operation_count": 2,
                "memo_type": "text",
                "memo": "Test payment",
                "ledger": 49823145,
                "fee_charged": "200"
            }
        ]),
        Some("NEXT_CURSOR_TOKEN"),
    )
    .await;

    let app_url = spawn_app(&horizon_mock.uri()).await;
    let response = reqwest::get(format!("{app_url}/account/{address}/history?limit=1"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let payload: Value = response.json().await.expect("json parse failed");

    assert_eq!(payload["address"], address);
    assert_eq!(payload["has_more"], true);
    assert_eq!(payload["next_cursor"], "NEXT_CURSOR_TOKEN");

    let tx = &payload["transactions"][0];
    assert_eq!(tx["transaction_hash"], "abc123def456");
    assert_eq!(tx["successful"], true);
    assert_eq!(tx["operation_count"], 2);
    assert_eq!(tx["ledger"], 49823145);
    assert_eq!(tx["ledger_closed_at"], "2024-06-15T10:30:00Z");
    assert!(
        tx["summary"]
            .as_str()
            .unwrap_or_default()
            .contains("Successful transaction with 2 operations")
    );
    assert!(
        tx["fee_explanation"]
            .as_str()
            .unwrap_or_default()
            .contains("0.0000200 XLM")
    );
}

#[tokio::test]
async fn account_history_has_more_false_when_no_next_cursor() {
    let horizon_mock = MockServer::start().await;
    let address = valid_stellar_address();

    mock_fee_stats(&horizon_mock).await;
    mock_account_transactions(
        &horizon_mock,
        &address,
        json!([{
            "hash": "single_tx",
            "successful": true,
            "created_at": "2024-01-01T00:00:00Z",
            "operation_count": 1,
            "memo_type": "none",
            "ledger": 100,
            "fee_charged": "100"
        }]),
        None,
    )
    .await;

    let app_url = spawn_app(&horizon_mock.uri()).await;
    let response = reqwest::get(format!("{app_url}/account/{address}/history"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let payload: Value = response.json().await.expect("json parse failed");
    assert_eq!(payload["has_more"], false);
    assert!(payload["next_cursor"].is_null());
}

#[tokio::test]
async fn account_history_invalid_address_returns_400() {
    let horizon_mock = MockServer::start().await;

    let app_url = spawn_app(&horizon_mock.uri()).await;
    let response = reqwest::get(format!("{app_url}/account/not-valid/history"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let payload: Value = response.json().await.expect("json parse failed");
    assert_eq!(payload["error"]["code"], "INVALID_ADDRESS_LENGTH");
    assert!(
        payload["error"]["message"]
            .as_str()
            .unwrap_or_default()
            .contains("Invalid Stellar address")
    );
}

#[tokio::test]
async fn account_history_limit_zero_returns_400() {
    let horizon_mock = MockServer::start().await;
    let address = valid_stellar_address();

    let app_url = spawn_app(&horizon_mock.uri()).await;
    let response = reqwest::get(format!("{app_url}/account/{address}/history?limit=0"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let payload: Value = response.json().await.expect("json parse failed");
    assert_eq!(payload["error"]["code"], "BAD_REQUEST");
}

#[tokio::test]
async fn account_history_limit_over_max_returns_400() {
    let horizon_mock = MockServer::start().await;
    let address = valid_stellar_address();

    let app_url = spawn_app(&horizon_mock.uri()).await;
    let response = reqwest::get(format!("{app_url}/account/{address}/history?limit=51"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn account_history_empty_response_has_more_false() {
    let horizon_mock = MockServer::start().await;
    let address = valid_stellar_address();

    mock_account_transactions(&horizon_mock, &address, json!([]), None).await;

    let app_url = spawn_app(&horizon_mock.uri()).await;
    let response = reqwest::get(format!("{app_url}/account/{address}/history?limit=10"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let payload: Value = response.json().await.expect("json parse failed");
    assert_eq!(payload["transactions"].as_array().unwrap().len(), 0);
    assert_eq!(payload["has_more"], false);
    assert!(payload["next_cursor"].is_null());
}

/// Regression test for reviewer feedback on PR #876:
/// Horizon includes `_links.next` on essentially every page — even the true
/// last page — so `has_more` must be derived from record count vs limit,
/// NOT from the presence of next_cursor. This test mocks a final page with
/// 2 records (fewer than the requested limit=10) but a non-null `next` link.
#[tokio::test]
async fn account_history_final_page_with_nonnull_next_link_returns_has_more_false() {
    let horizon_mock = MockServer::start().await;
    let address = valid_stellar_address();

    // 2 records < limit=10 → end of collection, even though next link is present
    mock_account_transactions_with_next(
        &horizon_mock,
        &address,
        json!([
            {
                "hash": "tx_final_1",
                "successful": true,
                "created_at": "2024-01-02T00:00:00Z",
                "operation_count": 1,
                "memo_type": "none",
                "ledger": 200,
                "fee_charged": "100"
            },
            {
                "hash": "tx_final_2",
                "successful": true,
                "created_at": "2024-01-01T00:00:00Z",
                "operation_count": 1,
                "memo_type": "none",
                "ledger": 199,
                "fee_charged": "100"
            }
        ]),
        "STALE_CURSOR_TOKEN",
    )
    .await;

    let app_url = spawn_app(&horizon_mock.uri()).await;
    let response = reqwest::get(format!("{app_url}/account/{address}/history?limit=10"))
        .await
        .expect("request failed");

    assert_eq!(response.status(), StatusCode::OK);

    let payload: Value = response.json().await.expect("json parse failed");
    // 2 records < limit=10 → has_more must be false, regardless of next_cursor
    assert_eq!(payload["transactions"].as_array().unwrap().len(), 2);
    assert_eq!(payload["has_more"], false);
    // next_cursor IS present (Horizon included it), but we ignore it for has_more
    assert_eq!(payload["next_cursor"], "STALE_CURSOR_TOKEN");
}
