mod models;
mod errors;
mod services;
mod explain;
mod routes;
mod config;
mod middleware;
mod state;

use axum::{
    middleware as axum_middleware,
    Router,
    routing::get,
    response::{IntoResponse, Response},
    http::{HeaderValue, Method, StatusCode, header},
    Json,
};
use tokio::net::TcpListener;
use tracing::info;
use std::{sync::Arc, env};
use serde::Serialize;
use tower::ServiceBuilder;
use tower_http::cors::{CorsLayer, AllowOrigin};
use tower_governor::{
    governor::GovernorConfigBuilder,
    GovernorLayer,
    key_extractor::PeerIpKeyExtractor,
};
use governor::middleware::NoOpMiddleware;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;
use tracing_subscriber::EnvFilter;

use crate::routes::{health::health, ApiDoc};
use crate::config::network::StellarNetwork;
use crate::services::horizon::HorizonClient;
use crate::middleware::request_id::request_id_middleware;


fn rate_limit_layer() -> GovernorLayer<PeerIpKeyExtractor, NoOpMiddleware> {
    let governor_conf = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(1)
            .burst_size(60)
            .finish()
            .expect("failed to build rate limit config"),
    );

    GovernorLayer { config: governor_conf }
}

#[derive(Serialize)]
struct RateLimitError {
    error: &'static str,
    message: &'static str,
}

impl IntoResponse for RateLimitError {
    fn into_response(self) -> Response {
        (StatusCode::TOO_MANY_REQUESTS, Json(self)).into_response()
    }
}

fn init_tracing() {
    let log_format = env::var("LOG_FORMAT").unwrap_or_else(|_| "pretty".to_string());
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

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

    // ── Network config ─────────────────────────────────────────
    let network = StellarNetwork::from_env();
    let horizon_url = env::var("HORIZON_URL")
        .unwrap_or_else(|_| network.horizon_url().to_string());

    info!(network = ?network, "network_selected");
    info!(horizon_url = %horizon_url, "horizon_url_selected");

    // ── CORS ────────────────────────────────────────────────────
    let cors_origin = env::var("CORS_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());

    info!(cors_origin = %cors_origin, "cors_origin_selected");

    let allowed_origin: HeaderValue = cors_origin
        .parse()
        .expect("CORS_ORIGIN is not valid");

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact(allowed_origin))
        .allow_methods([Method::GET, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::ACCEPT]);

    // ── App State ──────────────────────────────────────────────
    let horizon_client = Arc::new(HorizonClient::new(horizon_url));

    // Generate OpenAPI spec once
    let openapi = ApiDoc::openapi();

    // ── Router ─────────────────────────────────────────────────
    let app = Router::new()
        .route("/health", get(health))
        .route("/tx/:hash", get(routes::tx::get_tx_explanation))
        .route("/tx/:hash/raw", get(routes::tx::get_tx_raw))

        // OpenAPI JSON
        .route(
            "/openapi.json",
            get({
                let openapi = openapi.clone();
                move || async move { Json(openapi) }
            }),
        )

        // Swagger UI
        .merge(
            SwaggerUi::new("/docs")
                .url("/openapi.json", openapi),
        )

        .with_state(horizon_client)
        .layer(cors)
        .layer(
            ServiceBuilder::new()
                .layer(axum_middleware::from_fn(request_id_middleware))
                .layer(rate_limit_layer())
        );

    let addr = "0.0.0.0:4000";
    info!(bind_addr = %addr, "server_starting");

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}