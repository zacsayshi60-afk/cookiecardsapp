pub mod fixtures;
pub mod openrift;
pub mod riftdecks;

use anyhow::{Context, Result};
use sqlx::SqlitePool;
use tracing::{error, info};

use crate::config::SyncSource;
use crate::db;

#[derive(Debug, Clone, Default)]
pub struct SyncReport {
    pub tournaments: i64,
    pub decks: i64,
    pub cards: i64,
    pub message: String,
}

pub struct SyncOptions {
    pub tournament_pages: u32,
    pub max_tournaments: u32,
    pub max_decks: u32,
    pub delay_ms: u64,
    pub riftdecks_base: String,
    pub openrift_base: String,
    pub fixtures_dir: std::path::PathBuf,
}

pub async fn run(pool: &SqlitePool, source: SyncSource, opts: SyncOptions) -> Result<SyncReport> {
    let source_name = match source {
        SyncSource::Riftdecks => "riftdecks",
        SyncSource::Fixtures => "fixtures",
        SyncSource::Openrift => "openrift",
        SyncSource::All => "all",
    };

    let run_id = db::begin_sync_run(pool, source_name).await?;
    info!(source = source_name, run_id, "sync started");

    let result = match source {
        SyncSource::Riftdecks => {
            riftdecks::sync(
                pool,
                &opts.riftdecks_base,
                opts.tournament_pages,
                opts.max_tournaments,
                opts.max_decks,
                opts.delay_ms,
            )
            .await
        }
        SyncSource::Fixtures => fixtures::sync(pool, &opts.fixtures_dir).await,
        SyncSource::Openrift => openrift::sync(pool, &opts.openrift_base).await,
        SyncSource::All => sync_all(pool, &opts).await,
    };

    match result {
        Ok(report) => {
            db::finish_sync_run(
                pool,
                run_id,
                "ok",
                report.tournaments,
                report.decks,
                report.cards,
                Some(&report.message),
            )
            .await?;
            info!(
                tournaments = report.tournaments,
                decks = report.decks,
                cards = report.cards,
                "sync finished ok"
            );
            Ok(report)
        }
        Err(err) => {
            let msg = format!("{err:#}");
            error!(error = %msg, "sync failed");
            db::finish_sync_run(pool, run_id, "error", 0, 0, 0, Some(&msg)).await?;
            Err(err).context("sync failed")
        }
    }
}

async fn sync_all(pool: &SqlitePool, opts: &SyncOptions) -> Result<SyncReport> {
    let mut report = SyncReport::default();

    let fixtures = fixtures::sync(pool, &opts.fixtures_dir)
        .await
        .context("fixture sync")?;
    report.tournaments += fixtures.tournaments;
    report.decks += fixtures.decks;
    report.cards += fixtures.cards;

    match openrift::sync(pool, &opts.openrift_base).await {
        Ok(cards) => {
            report.cards += cards.cards;
            report.message = format!(
                "fixtures + openrift enrichment. fixtures: {}; openrift: {}",
                fixtures.message, cards.message
            );
        }
        Err(err) => {
            report.message = format!(
                "fixtures loaded ({}); openrift enrichment skipped: {err:#}",
                fixtures.message
            );
        }
    }

    // Best-effort live RiftDecks crawl. Cloudflare or ToS blocks must not fail the whole run.
    match riftdecks::sync(
        pool,
        &opts.riftdecks_base,
        opts.tournament_pages,
        opts.max_tournaments,
        opts.max_decks,
        opts.delay_ms,
    )
    .await
    {
        Ok(live) => {
            report.tournaments += live.tournaments;
            report.decks += live.decks;
            report.cards += live.cards;
            report.message = format!("{}; riftdecks: {}", report.message, live.message);
        }
        Err(err) => {
            report.message = format!(
                "{}; riftdecks live crawl skipped: {err:#}",
                report.message
            );
        }
    }

    Ok(report)
}
