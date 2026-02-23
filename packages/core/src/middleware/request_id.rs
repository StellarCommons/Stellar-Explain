use axum::{
    body::Body,
    http::{Request, HeaderValue},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct RequestId(pub Uuid);

impl RequestId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl std::fmt::Display for RequestId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

pub async fn request_id_middleware(
    mut request: Request<Body>,
    next: Next,
) -> Response {
    let request_id = RequestId::new();
    request.extensions_mut().insert(request_id.clone());

    let mut response = next.run(request).await;
    if let Ok(header_value) = HeaderValue::from_str(&request_id.to_string()) {
        response.headers_mut().insert("x-request-id", header_value);
    }

    response
}
