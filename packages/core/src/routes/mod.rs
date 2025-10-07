pub mod transactions;

use axum::routing::get;
use axum::Router;

use crate::handlers::tx::get_transaction;
use crate::routes::transactions::get_account_transactions;

pub fn routes() -> Router {
    Router::new()
        .route("/tx/:hash", get(get_transaction))
        .route("/account/:address", get(get_account_transactions))
}