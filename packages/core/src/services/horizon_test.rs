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

    #[tokio::test]
    async fn fetch_account_transactions_default_pagination() {
        let server = MockServer::start();
        let base = server.base_url();

        server.mock(|when, then| {
            when.method(GET)
                .path("/accounts/GABC/transactions")
                .query_param("limit", "10")
                .query_param("order", "asc");
            then.status(200).json_body(serde_json::json!({
                "_links": {
                    "next": { "href": format!("{}/accounts/GABC/transactions?cursor=TOKEN_NEXT&limit=10&order=asc", base) },
                    "prev": { "href": format!("{}/accounts/GABC/transactions?cursor=TOKEN_PREV&limit=10&order=asc", base) }
                },
                "_embedded": {
                    "records": [
                        {
                            "hash": "tx1",
                            "successful": true,
                            "created_at": "2024-01-01T00:00:00Z",
                            "source_account": "GABC",
                            "operation_count": 1,
                            "memo_type": "none"
                        }
                    ]
                }
            }));
        });

        let client = HorizonClient::new(server.base_url());
        let (records, next, prev) = client
            .fetch_account_transactions("GABC", 10, None, "asc")
            .await
            .unwrap();

        assert_eq!(records.len(), 1);
        assert_eq!(records[0].hash, "tx1");
        assert_eq!(next.as_deref(), Some("TOKEN_NEXT"));
        assert_eq!(prev.as_deref(), Some("TOKEN_PREV"));
    }

    #[tokio::test]
    async fn fetch_account_transactions_custom_limit() {
        let server = MockServer::start();
        let base = server.base_url();

        server.mock(|when, then| {
            when.method(GET)
                .path("/accounts/GXYZ/transactions")
                .query_param("limit", "25")
                .query_param("order", "desc");
            then.status(200).json_body(serde_json::json!({
                "_links": {
                    "next": { "href": format!("{}/accounts/GXYZ/transactions?cursor=C2&limit=25&order=desc", base) },
                    "prev": { "href": format!("{}/accounts/GXYZ/transactions?cursor=C1&limit=25&order=desc", base) }
                },
                "_embedded": { "records": [] }
            }));
        });

        let client = HorizonClient::new(server.base_url());
        let (records, next, _) = client
            .fetch_account_transactions("GXYZ", 25, None, "desc")
            .await
            .unwrap();

        assert!(records.is_empty());
        assert_eq!(next.as_deref(), Some("C2"));
    }

    #[tokio::test]
    async fn fetch_account_transactions_cursor_navigation() {
        let server = MockServer::start();
        let base = server.base_url();

        server.mock(|when, then| {
            when.method(GET)
                .path("/accounts/GABC/transactions")
                .query_param("cursor", "MY_CURSOR");
            then.status(200).json_body(serde_json::json!({
                "_links": {
                    "next": { "href": format!("{}/accounts/GABC/transactions?cursor=NEXT&limit=10&order=asc", base) },
                    "prev": { "href": format!("{}/accounts/GABC/transactions?cursor=PREV&limit=10&order=asc", base) }
                },
                "_embedded": { "records": [] }
            }));
        });

        let client = HorizonClient::new(server.base_url());
        let (_, next, prev) = client
            .fetch_account_transactions("GABC", 10, Some("MY_CURSOR"), "asc")
            .await
            .unwrap();

        assert_eq!(next.as_deref(), Some("NEXT"));
        assert_eq!(prev.as_deref(), Some("PREV"));
    }

    #[tokio::test]
    async fn fetch_account_transactions_not_found() {
        let server = MockServer::start();

        server.mock(|when, then| {
            when.method(GET).path("/accounts/GBAD/transactions");
            then.status(404);
        });

        let client = HorizonClient::new(server.base_url());
        let err = client
            .fetch_account_transactions("GBAD", 10, None, "asc")
            .await
            .unwrap_err();

        matches!(err, crate::errors::HorizonError::AccountNotFound);
    }
}
