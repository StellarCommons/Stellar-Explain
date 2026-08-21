use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        health::health,
        tx::get_tx_explanation,
        account::get_account_transactions,
    ),
    components(
        schemas(
            health::HealthResponse,
            tx::TxExplanationResponse,
            account::AccountHistoryTransaction,
            account::AccountHistoryResponse,
        )
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "transactions", description = "Transaction explanation endpoints"),
        (name = "accounts", description = "Account history endpoints")
    )
)]
pub struct ApiDoc;

pub mod account;
pub mod analytics;
pub mod health;
pub mod tx;
