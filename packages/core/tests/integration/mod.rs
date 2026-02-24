use std::{sync::Arc, time::Duration};

use axum::{middleware, routing::get, Router};
use reqwest::StatusCode;
use serde_json::{json, Value};
use stellar_explain_core::{
    middleware::request_id::request_id_middleware,
    routes::tx::get_tx_explanation,
    services::horizon::HorizonClient,
};
use tokio::net::TcpListener;
use wiremock::{
    matchers::{method, path},
    Mock, MockServer, ResponseTemplate,
};

fn test_hash(seed: char) -> String {
    std::iter::repeat(seed).take(64).collect()
}

async fn spawn_app(horizon_base_url: &str) -> String {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("failed to bind ephemeral port");
    let addr = listener.local_addr().expect("failed to read local addr");

    let app = Router::new()
        .route("/tx/:hash", get(get_tx_explanation))
        .with_state(Arc::new(HorizonClient::new(horizon_base_url.to_string())))
        .layer(middleware::from_fn(request_id_middleware));

    tokio::spawn(async move {
        axum::serve(listener, app)
            .await
            .expect("server failed unexpectedly");
    });

    // Small delay to avoid request race with startup.
    tokio::time::sleep(Duration::from_millis(40)).await;

    format!("http://{}", addr)
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
    assert!(payload["summary"].as_str().unwrap_or_default().contains("payment"));
    assert_eq!(payload["payment_explanations"][0]["amount"], "500.0000000");
    assert!(payload["payment_explanations"][0]["summary"]
        .as_str()
        .unwrap_or_default()
        .contains("Coinbase"));
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
