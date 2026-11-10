//! Optional Gatherer enrichment for Magic cards that already carry a
//! `gatherer:{multiverse_id}` public code (from Scryfall).
//!
//! Gatherer's HTML UI is brittle and rate-limited; this importer only refreshes
//! a sample of already-known multiverse ids rather than crawling the whole site.

use anyhow::{Context, Result};
use regex::Regex;
use sqlx::SqlitePool;
use tracing::info;

use crate::db;
use crate::import::SyncReport;

pub async fn sync(pool: &SqlitePool, base_url: &str, delay_ms: u64, max_cards: u32) -> Result<SyncReport> {
    let base = base_url.trim_end_matches('/');
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .user_agent("CardessyImporter/0.1 (magisterium/gatherer enrichment)")
        .build()?;

    let ids = db::list_gatherer_multiverse_ids(pool, max_cards as i64).await?;
    if ids.is_empty() {
        return Ok(SyncReport {
            tournaments: 0,
            decks: 0,
            cards: 0,
            message: "no gatherer multiverse ids in DB — run --source scryfall first".into(),
        });
    }

    let name_re = Regex::new(
        r#"(?s)id="ctl00_ctl00_ctl00_MainContent_SubContent_SubContent_nameRow".*?<div[^>]*>\s*([^<]+)"#,
    )
    .unwrap();
    let type_re = Regex::new(
        r#"(?s)id="ctl00_ctl00_ctl00_MainContent_SubContent_SubContent_typeRow".*?<div[^>]*>\s*([^<]+)"#,
    )
    .unwrap();
    let text_re = Regex::new(
        r#"(?s)id="ctl00_ctl00_ctl00_MainContent_SubContent_SubContent_textRow".*?cardtextbox[^>]*>(.*?)</div>"#,
    )
    .unwrap();

    let mut updated = 0i64;
    for mid in ids {
        let url = format!("{base}/Pages/Card/Details.aspx?multiverseid={mid}");
        let resp = client.get(&url).send().await;
        let Ok(resp) = resp else {
            continue;
        };
        if !resp.status().is_success() {
            continue;
        }
        let html = resp.text().await.unwrap_or_default();
        if html.contains("Just a moment") || html.contains("cf-browser-verification") {
            return Err(anyhow::anyhow!(
                "Gatherer blocked access (Cloudflare/challenge). Use --source scryfall instead."
            ));
        }

        let name = name_re
            .captures(&html)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().trim().to_string());
        let type_line = type_re
            .captures(&html)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().trim().to_string());
        let text = text_re
            .captures(&html)
            .and_then(|c| c.get(1))
            .map(|m| strip_tags(m.as_str()));

        let Some(name) = name else {
            continue;
        };

        let id = format!("gatherer-{mid}");
        db::upsert_game_card(
            pool,
            &id,
            "magic",
            &name,
            type_line.as_deref(),
            &[],
            &[],
            None,
            None,
            None,
            None,
            None,
            Some(&format!("gatherer:{mid}")),
            Some(&format!(
                "https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid={mid}&type=card"
            )),
            None,
            None,
            None,
            text.as_deref(),
            false,
            "gatherer",
            None,
        )
        .await
        .with_context(|| format!("upsert gatherer card {mid}"))?;
        updated += 1;

        if delay_ms > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
        }
    }

    info!(updated, "Gatherer enrichment done");
    Ok(SyncReport {
        tournaments: 0,
        decks: 0,
        cards: updated,
        message: format!("enriched {updated} Magic cards from Gatherer HTML"),
    })
}

fn strip_tags(html: &str) -> String {
    let re = Regex::new(r"<[^>]+>").unwrap();
    re.replace_all(html, " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}
