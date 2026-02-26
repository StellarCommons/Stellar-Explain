use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        health::health,
        tx::get_tx_explanation,
        tx::get_tx_raw
    ),
    components(
        schemas(
            health::HealthResponse,
            tx::TxExplanationResponse
        )
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "transactions", description = "Transaction explanation endpoints")
    )
)]
pub struct ApiDoc;

pub mod tx;
pub mod account;
pub mod health;
