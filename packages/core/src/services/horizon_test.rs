#[cfg(test)]
mod tests {
    use super::super::horizon::*;
    use httpmock::prelude::*;

    #[tokio::test]
    async fn fetch_transaction_success() {
        let server = MockServer::start();

        server.mock(|when, then| {
            when.method(GET)
                .path("/transactions/abc123");
            then.status(200)
                .json_body(serde_json::json!({
                    "hash": "abc123",
                    "successful": true,
                    "fee_charged": "100"
                }));
        });

        let client = HorizonClient::new(server.base_url());
        let tx = client.fetch_transaction("abc123").await.unwrap();

        assert_eq!(tx.hash, "abc123");
        assert!(tx.successful);
        assert_eq!(tx.fee_charged, "100");
    }

    #[tokio::test]
    async fn fetch_transaction_not_found() {
        let server = MockServer::start();

        server.mock(|when, then| {
            when.method(GET)
                .path("/transactions/missing");
            then.status(404);
        });

        let client = HorizonClient::new(server.base_url());
        let err = client.fetch_transaction("missing").await.unwrap_err();

        matches!(err, crate::errors::HorizonError::TransactionNotFound);
    }

    #[tokio::test]
    async fn fetch_transaction_invalid_response() {
        let server = MockServer::start();

        server.mock(|when, then| {
            when.method(GET)
                .path("/transactions/bad");
            then.status(200)
                .body("not-json");
        });

        let client = HorizonClient::new(server.base_url());
        let err = client.fetch_transaction("bad").await.unwrap_err();

        matches!(err, crate::errors::HorizonError::InvalidResponse);
    }
}
