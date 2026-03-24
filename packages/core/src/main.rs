mod config;
mod errors;
mod explain;
mod middleware;
mod models;
mod routes;
mod services;
mod state;

use axum::{
    Router,
    http::{HeaderValue, Method, header},
    middleware as axum_middleware,
    routing::get,
};
use std::{env, sync::Arc};
use tokio::net::TcpListener;
use tower::ServiceBuilder;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::info;
use tracing_subscriber::EnvFilter;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::network::StellarNetwork;
use crate::middleware::request_id::request_id_middleware;
use crate::routes::{ApiDoc, health::health};
use crate::services::horizon::HorizonClient;

fn init_tracing() {
    let log_format = env::var("LOG_FORMAT").unwrap_or_else(|_| "pretty".to_string());
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    if log_format.eq_ignore_ascii_case("json") {
        tracing_subscriber::fmt()
            .with_env_filter(env_filter)
            .with_target(false)
            .json()
            .with_current_span(true)
            .with_span_list(true)
            .init();
    } else {
        tracing_subscriber::fmt()
            .with_env_filter(env_filter)
            .with_target(false)
            .compact()
            .init();
    }
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    init_tracing();

    let network = StellarNetwork::from_env();
    let horizon_url = env::var("HORIZON_URL").unwrap_or_else(|_| network.horizon_url().to_string());

    info!(network = ?network, "network_selected");
    info!(horizon_url = %horizon_url, "horizon_url_selected");

    let cors_origin =
        env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".to_string());

    info!(cors_origin = %cors_origin, "cors_origin_selected");

    let allowed_origin: HeaderValue = cors_origin.parse().expect("CORS_ORIGIN is not valid");

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact(allowed_origin))
        .allow_methods([Method::GET, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::ACCEPT]);

    let horizon_client = Arc::new(HorizonClient::new(horizon_url));

    // SwaggerUi::url() registers /openapi.json internally.
    // Do NOT add a separate .route("/openapi.json") or Axum will panic
    // with "Overlapping method route" at startup.
    let openapi = ApiDoc::openapi();

    let app = Router::new()
        .route("/health", get(health))
        .route("/tx/:hash", get(routes::tx::get_tx_explanation))
        .route(
            "/account/:address",
            get(routes::account::get_account_explanation),
        )
        .merge(SwaggerUi::new("/docs").url("/openapi.json", openapi))
        .with_state(horizon_client)
        .layer(cors)
        .layer(ServiceBuilder::new().layer(axum_middleware::from_fn(request_id_middleware)));

    // Rate limiting (tower_governor) removed for local dev.
    // PeerIpKeyExtractor cannot extract IPs from loopback connections
    // and returns "Unable To Extract Key!". Re-add behind a reverse
    // proxy in production where X-Forwarded-For is available.

    let addr = "0.0.0.0:4000";
    info!(bind_addr = %addr, "server_starting");

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
