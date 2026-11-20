use axum::{
    Json,
    body::Body,
    http::{Request, StatusCode, header::AUTHORIZATION},
    middleware::Next,
    response::{IntoResponse, Response},
};
use serde_json::json;

fn is_authorized(header_value: Option<&str>, expected: &str) -> bool {
    header_value
        .and_then(|value| value.strip_prefix("Bearer "))
        .is_some_and(|token| token == expected)
}

fn unauthorized(message: &str) -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(json!({ "error": { "code": "UNAUTHORIZED", "message": message } })),
    )
        .into_response()
}

/// Protects the read-side `/analytics/*` endpoints with a static bearer
/// token from `ANALYTICS_READ_TOKEN`. `/analytics/ingest` uses a separate
/// write token and should not be wrapped with this middleware.
pub async fn require_analytics_read_token(request: Request<Body>, next: Next) -> Response {
    let Ok(expected) = std::env::var("ANALYTICS_READ_TOKEN") else {
        return unauthorized("ANALYTICS_READ_TOKEN is not configured");
    };

    let header_value = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok());

    if is_authorized(header_value, &expected) {
        next.run(request).await
    } else {
        unauthorized("missing or invalid bearer token")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_matching_bearer_token() {
        assert!(is_authorized(Some("Bearer secret"), "secret"));
    }

    #[test]
    fn rejects_missing_header() {
        assert!(!is_authorized(None, "secret"));
    }

    #[test]
    fn rejects_wrong_token() {
        assert!(!is_authorized(Some("Bearer wrong"), "secret"));
    }

    #[test]
    fn rejects_missing_bearer_prefix() {
        assert!(!is_authorized(Some("secret"), "secret"));
    }
}
