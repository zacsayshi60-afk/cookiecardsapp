//! Live importer for [RiftDecks.com](https://riftdecks.com).
//!
//! RiftDecks does **not** publish a documented public API. This module fetches the
//! same public HTML pages a browser would see, then parses tournaments, decks, and
//! card lines into the unified Cardessy database.
//!
//! Important:
//! - Be polite: default delay between requests, small page limits.
//! - Their `robots.txt` forbids scraping for competing services. Use this for your
//!   own Cardessy-backed app, not to republish a rival metagame site.
//! - Some cloud IPs are blocked by Cloudflare. Prefer `cardessy sync --source fixtures`
//!   when live crawl fails.

use std::time::Duration;

use anyhow::{anyhow, bail, Context, Result};
use regex::Regex;
use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT};
use scraper::{Html, Selector};
use sqlx::SqlitePool;
use tracing::{debug, info, warn};
use url::Url;

use crate::db;
use crate::import::SyncReport;
use crate::models::{
    LegendMeta, ParsedDeckCard, ParsedDeckDetail, ParsedDeckSummary, ParsedTournament,
};

pub async fn sync(
    pool: &SqlitePool,
    base_url: &str,
    tournament_pages: u32,
    max_tournaments: u32,
    max_decks: u32,
    delay_ms: u64,
) -> Result<SyncReport> {
    let client = HttpClient::new(base_url)?;
    let delay = Duration::from_millis(delay_ms);

    info!(%base_url, tournament_pages, max_tournaments, max_decks, "starting RiftDecks crawl");

    // Home page: legend metagame table (best-effort).
    match client.get_html("/").await {
        Ok(html) => {
            let legends = parse_legend_meta(&html);
            for legend in &legends {
                db::upsert_legend_meta(pool, legend).await?;
            }
            info!(count = legends.len(), "imported legend meta from home page");
        }
        Err(err) => warn!(error = %err, "could not fetch RiftDecks home page"),
    }
    sleep(delay).await;

    let mut tournaments = Vec::new();
    for page in 1..=tournament_pages.max(1) {
        let path = if page == 1 {
            "/riftbound-tournaments".to_string()
        } else {
            format!("/riftbound-tournaments?page={page}")
        };
        let html = client
            .get_html(&path)
            .await
            .with_context(|| format!("fetch tournament list {path}"))?;
        let found = parse_tournament_list(&html, &client.base);
        info!(page, count = found.len(), "parsed tournament list page");
        tournaments.extend(found);
        sleep(delay).await;
        if tournaments.len() as u32 >= max_tournaments {
            break;
        }
    }

    tournaments.truncate(max_tournaments as usize);

    let mut deck_summaries: Vec<(Option<i64>, ParsedDeckSummary)> = Vec::new();
    let mut tournament_count = 0i64;

    for t in &tournaments {
        let html = match client.get_html_url(&t.source_url).await {
            Ok(h) => h,
            Err(err) => {
                warn!(url = %t.source_url, error = %err, "skip tournament");
                continue;
            }
        };
        let detail = parse_tournament_detail(&html, &t.source_url).unwrap_or_else(|| t.clone());
        db::upsert_tournament(pool, &detail).await?;
        tournament_count += 1;

        let decks = parse_deck_links_from_tournament(&html, &client.base);
        info!(
            tournament_id = detail.id,
            decks = decks.len(),
            "tournament imported"
        );
        for deck in decks {
            deck_summaries.push((Some(detail.id), deck));
        }
        sleep(delay).await;
        if deck_summaries.len() as u32 >= max_decks {
            break;
        }
    }

    // If tournament pages were empty (layout change / block), fall back to the global deck list.
    if deck_summaries.is_empty() {
        warn!("no decks from tournaments; falling back to /riftbound-decks");
        let html = client.get_html("/riftbound-decks").await?;
        for deck in parse_deck_links_from_list(&html, &client.base) {
            deck_summaries.push((None, deck));
            if deck_summaries.len() as u32 >= max_decks {
                break;
            }
        }
        sleep(delay).await;
    }

    deck_summaries.truncate(max_decks as usize);

    let mut deck_count = 0i64;
    let mut card_names = 0i64;

    for (tournament_id, summary) in deck_summaries {
        let html = match client.get_html_url(&summary.source_url).await {
            Ok(h) => h,
            Err(err) => {
                warn!(url = %summary.source_url, error = %err, "skip deck");
                continue;
            }
        };
        let detail = parse_deck_detail(&html, summary, tournament_id)?;
        card_names += detail.cards.len() as i64;
        db::upsert_deck(pool, &detail).await?;
        deck_count += 1;
        debug!(deck_id = detail.summary.id, cards = detail.cards.len(), "deck imported");
        sleep(delay).await;
    }

    Ok(SyncReport {
        tournaments: tournament_count,
        decks: deck_count,
        cards: card_names,
        message: format!(
            "live crawl from {base_url}: {tournament_count} tournaments, {deck_count} decks"
        ),
    })
}

struct HttpClient {
    http: reqwest::Client,
    base: Url,
}

impl HttpClient {
    fn new(base_url: &str) -> Result<Self> {
        let mut headers = HeaderMap::new();
        headers.insert(
            USER_AGENT,
            HeaderValue::from_static(
                "CardessyImporter/0.1 (+https://github.com/cardessy; personal app sync; respectful)",
            ),
        );
        headers.insert(
            reqwest::header::ACCEPT,
            HeaderValue::from_static("text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"),
        );

        let http = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(30))
            .redirect(reqwest::redirect::Policy::limited(5))
            .build()?;

        Ok(Self {
            http,
            base: Url::parse(base_url).context("invalid RiftDecks base URL")?,
        })
    }

    async fn get_html(&self, path: &str) -> Result<String> {
        let url = self.base.join(path)?;
        self.get_html_url(url.as_str()).await
    }

    async fn get_html_url(&self, url: &str) -> Result<String> {
        let response = self.http.get(url).send().await.with_context(|| format!("GET {url}"))?;
        let status = response.status();
        let body = response.text().await?;
        if !status.is_success() {
            bail!("HTTP {status} for {url}");
        }
        if body.contains("Attention Required") && body.contains("Cloudflare") {
            bail!("Cloudflare blocked access to {url}");
        }
        Ok(body)
    }
}

async fn sleep(delay: Duration) {
    if !delay.is_zero() {
        tokio::time::sleep(delay).await;
    }
}

fn parse_tournament_list(html: &str, base: &Url) -> Vec<ParsedTournament> {
    let re = Regex::new(
        r#"(?i)/riftbound-tournaments/([a-z0-9\-]+)-tournament-decks-(\d+)"#,
    )
    .expect("regex");

    let mut out = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for cap in re.captures_iter(html) {
        let slug = cap[1].to_string();
        let id: i64 = match cap[2].parse() {
            Ok(v) => v,
            Err(_) => continue,
        };
        if !seen.insert(id) {
            continue;
        }
        let path = format!("/riftbound-tournaments/{slug}-tournament-decks-{id}");
        let source_url = base
            .join(&path)
            .map(|u| u.to_string())
            .unwrap_or_else(|_| path.clone());
        let name = humanize_slug(&slug);
        out.push(ParsedTournament {
            id,
            slug,
            name,
            host: None,
            country: None,
            event_date: None,
            meta: None,
            format: None,
            player_count: None,
            source_url,
        });
    }
    out
}

fn parse_tournament_detail(html: &str, source_url: &str) -> Option<ParsedTournament> {
    let id = Regex::new(r"tournament-decks-(\d+)")
        .ok()?
        .captures(source_url)
        .and_then(|c| c[1].parse().ok())?;
    let slug = Regex::new(r"/riftbound-tournaments/([a-z0-9\-]+)-tournament-decks-")
        .ok()?
        .captures(source_url)
        .map(|c| c[1].to_string())
        .unwrap_or_else(|| format!("tournament-{id}"));

    let document = Html::parse_document(html);
    let title = text_of_first(&document, "h1").unwrap_or_else(|| humanize_slug(&slug));
    let name = title
        .replace(" Riftbound Top Decks", "")
        .trim()
        .to_string();

    let player_count = Regex::new(r"(?i)(\d+)\s*Players")
        .ok()
        .and_then(|re| re.captures(html))
        .and_then(|c| c[1].parse().ok());

    let country = capture_after_label(html, "United States")
        .or_else(|| capture_country(html));

    let meta = Regex::new(r"(?i)Meta\s*</?\w*>\s*([A-Za-z ]+)")
        .ok()
        .and_then(|re| re.captures(html))
        .map(|c| c[1].trim().to_string())
        .or_else(|| {
            if html.contains("Radiance") {
                Some("Radiance".into())
            } else if html.contains("Vendetta") {
                Some("Vendetta".into())
            } else {
                None
            }
        });

    let host = Regex::new(r"(?i)Organized/Hosted by\s*([^<\n]+)")
        .ok()
        .and_then(|re| re.captures(html))
        .map(|c| c[1].trim().to_string());

    let event_date = parse_loose_date(html);

    Some(ParsedTournament {
        id,
        slug,
        name,
        host,
        country,
        event_date,
        meta,
        format: Some("Constructed".into()),
        player_count,
        source_url: source_url.to_string(),
    })
}

fn parse_deck_links_from_tournament(html: &str, base: &Url) -> Vec<ParsedDeckSummary> {
    parse_deck_links(html, base)
}

fn parse_deck_links_from_list(html: &str, base: &Url) -> Vec<ParsedDeckSummary> {
    parse_deck_links(html, base)
}

fn parse_deck_links(html: &str, base: &Url) -> Vec<ParsedDeckSummary> {
    let re = Regex::new(r#"(?i)/riftbound-metagame/deck-([a-z0-9\-]+)-(\d+)"#).expect("regex");
    let mut out = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for cap in re.captures_iter(html) {
        let slug = cap[1].to_string();
        let id: i64 = match cap[2].parse() {
            Ok(v) => v,
            Err(_) => continue,
        };
        if !seen.insert(id) {
            continue;
        }
        let path = format!("/riftbound-metagame/deck-{slug}-{id}");
        let source_url = base
            .join(&path)
            .map(|u| u.to_string())
            .unwrap_or_else(|_| path);
        out.push(ParsedDeckSummary {
            id,
            slug: slug.clone(),
            name: humanize_slug(&slug),
            player_name: None,
            legend: None,
            rank_label: None,
            record: None,
            price_usd: None,
            spiciness_pct: None,
            card_count: None,
            meta: None,
            source_url,
        });
    }
    out
}

fn parse_deck_detail(
    html: &str,
    mut summary: ParsedDeckSummary,
    tournament_id: Option<i64>,
) -> Result<ParsedDeckDetail> {
    let document = Html::parse_document(html);

    if let Some(h1) = text_of_first(&document, "h1") {
        // Typical title: "Deck Name by Player"
        if let Some((name, player)) = h1.rsplit_once(" by ") {
            summary.name = name.trim().to_string();
            summary.player_name = Some(player.trim().to_string());
        } else {
            summary.name = h1;
        }
    }

    if let Some(price) = Regex::new(r"\$([0-9]+(?:\.[0-9]+)?)")
        .ok()
        .and_then(|re| re.captures(html))
        .and_then(|c| c[1].parse().ok())
    {
        summary.price_usd = Some(price);
    }

    if let Some(cards) = Regex::new(r"(\d+)\s*Cards")
        .ok()
        .and_then(|re| re.captures(html))
        .and_then(|c| c[1].parse().ok())
    {
        summary.card_count = Some(cards);
    }

    let event_date = parse_iso_date(html).or_else(|| parse_loose_date(html));

    let cards = parse_deck_cards(html);
    if cards.is_empty() {
        return Err(anyhow!(
            "no card lines parsed for deck {} ({})",
            summary.id,
            summary.source_url
        ));
    }

    if summary.legend.is_none() {
        summary.legend = cards
            .iter()
            .find(|c| c.section == "legend")
            .map(|c| c.card_name.clone());
    }

    Ok(ParsedDeckDetail {
        summary,
        tournament_id,
        event_date,
        cards,
    })
}

fn parse_deck_cards(html: &str) -> Vec<ParsedDeckCard> {
    // Prefer markdown-ish / table text patterns from the rendered page.
    // Section headers look like: legend (1) / unit (21) / sideboard (10)
    let section_re =
        Regex::new(r"(?i)\b(legend|champion|unit|gear|spell|battlefields?|runes?|sideboard)\s*\((\d+)\)")
            .expect("regex");
    let card_re = Regex::new(
        r"(?m)^\s*(?:\|\s*)?(\d+)\s*\|\s*([^|$]+?)\s*\|\s*\$?([0-9]+(?:\.[0-9]+)?)?\s*\|?",
    )
    .expect("regex");

    let mut cards = Vec::new();
    let mut current_section = String::from("main");

    // Walk line by line so section context sticks.
    for line in html.lines() {
        let plain = strip_tags(line);
        if let Some(cap) = section_re.captures(&plain) {
            current_section = normalize_section(&cap[1]);
            continue;
        }
        if let Some(cap) = card_re.captures(&plain) {
            let quantity: i64 = match cap[1].parse() {
                Ok(v) => v,
                Err(_) => continue,
            };
            let name = cap[2].trim().to_string();
            if name.is_empty() || name.eq_ignore_ascii_case("name") {
                continue;
            }
            let price = cap
                .get(3)
                .and_then(|m| m.as_str().parse::<f64>().ok());
            cards.push(ParsedDeckCard {
                section: current_section.clone(),
                card_name: name,
                quantity,
                price_usd: price,
            });
        }
    }

    // Fallback: quantity + card name without table pipes.
    if cards.is_empty() {
        let loose = Regex::new(
            r"(?i)(?:^|\n)\s*(\d+)\s+([A-Z][^$\n]{2,80}?)\s+\$([0-9]+(?:\.[0-9]+)?)",
        )
        .expect("regex");
        let mut section = String::from("main");
        for cap in section_re.captures_iter(html) {
            // establish first section only for loose mode start
            section = normalize_section(&cap[1]);
            break;
        }
        for cap in loose.captures_iter(&strip_tags(html)) {
            if let Some(sec) = section_re
                .captures_iter(&strip_tags(html)[..cap.get(0).unwrap().start()])
                .last()
            {
                section = normalize_section(&sec[1]);
            }
            cards.push(ParsedDeckCard {
                section: section.clone(),
                card_name: cap[2].trim().to_string(),
                quantity: cap[1].parse().unwrap_or(1),
                price_usd: cap[3].parse().ok(),
            });
        }
    }

    cards
}

fn parse_legend_meta(html: &str) -> Vec<LegendMeta> {
    // Home page table rows are messy after HTML→text; use a tolerant pattern.
    let re = Regex::new(
        r"(?i)([A-Z][A-Za-z' ,.\-]{2,60}?)\s+(\d+)\s*Decks.*?(\d+)%\s*Metashare.*?(\d+)\s+(\d+)\s+\$(\d+)",
    )
    .expect("regex");
    let text = strip_tags(html);
    let mut out = Vec::new();
    for cap in re.captures_iter(&text) {
        out.push(LegendMeta {
            legend: cap[1].trim().to_string(),
            meta_share_pct: cap[3].parse().ok(),
            total_decks: cap[2].parse().ok(),
            top8_count: cap[5].parse().ok(),
            avg_price_usd: cap[6].parse().ok(),
            tier: None,
            win_rate_pct: None,
            updated_at: String::new(),
        });
    }
    out
}

fn normalize_section(raw: &str) -> String {
    match raw.to_ascii_lowercase().as_str() {
        "battlefield" | "battlefields" => "battlefields".into(),
        "rune" | "runes" => "runes".into(),
        other => other.to_string(),
    }
}

fn humanize_slug(slug: &str) -> String {
    slug.replace('-', " ")
        .split_whitespace()
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn text_of_first(document: &Html, selector: &str) -> Option<String> {
    let sel = Selector::parse(selector).ok()?;
    document
        .select(&sel)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .filter(|s| !s.is_empty())
}

fn strip_tags(input: &str) -> String {
    let re = Regex::new(r"<[^>]+>").expect("regex");
    re.replace_all(input, " ").to_string()
}

fn parse_iso_date(html: &str) -> Option<String> {
    Regex::new(r"(20\d{2}-\d{2}-\d{2})")
        .ok()?
        .captures(html)
        .map(|c| c[1].to_string())
}

fn parse_loose_date(html: &str) -> Option<String> {
    // e.g. 8/9/26 or 2026-08-09 already handled
    let re = Regex::new(r"\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b").ok()?;
    let cap = re.captures(html)?;
    let month: u32 = cap[1].parse().ok()?;
    let day: u32 = cap[2].parse().ok()?;
    let mut year: i32 = cap[3].parse().ok()?;
    if year < 100 {
        year += 2000;
    }
    Some(format!("{year:04}-{month:02}-{day:02}"))
}

fn capture_country(html: &str) -> Option<String> {
    for country in [
        "United States",
        "China",
        "France",
        "Australia",
        "Germany",
        "Spain",
        "Japan",
        "Canada",
        "United Kingdom",
        "Singapore",
    ] {
        if html.contains(country) {
            return Some(country.into());
        }
    }
    None
}

fn capture_after_label<'a>(html: &'a str, label: &'a str) -> Option<String> {
    if html.contains(label) {
        Some(label.to_string())
    } else {
        None
    }
}
