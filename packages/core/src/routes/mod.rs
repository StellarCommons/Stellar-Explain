pub mod tx;
pub mod logging;

pub use tx::*;
pub use logging::*;

use axum::routing::get;
use axum::Router;

use crate::routes::transaction::{get_transaction, get_account_transactions};

pub fn routes() -> Router {
    Router::new()
        .route("/tx/:hash", get(get_transaction))
        .route("/account/:address", get(get_account_transactions))
}