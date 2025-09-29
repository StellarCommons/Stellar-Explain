use axum::{routing::get, Router};
use crate::handlers::tx::get_transaction;

pub fn create_routes() -> Router {
    Router::new()
        .route("/tx/:hash", get(get_transaction))
}
