use reqwest::Client;
use crate::cache::{get_from_cache, insert_into_cache};

pub async fn get_account_data(account_id: &str) -> anyhow::Result<String> {
    let cache_key = format!("account:{}", account_id);

    if let Some(cached) = get_from_cache(&cache_key).await {
        println!("✅ Served from cache: {}", account_id);
        return Ok(cached);
    }

    
    let url = format!("https://horizon.stellar.org/accounts/{}", account_id);
    let res = Client::new().get(&url).send().await?.text().await?;

    insert_into_cache(&cache_key, res.clone()).await;
    Ok(res)
}