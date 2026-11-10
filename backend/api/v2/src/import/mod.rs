pub mod bilgewater;
pub mod domain_fixes;
pub mod fabrary;
pub mod fixtures;
pub mod gatherer;
pub mod local;
pub mod openrift;
pub mod riftdecks;
pub mod scryfall;

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
    pub bilgewater_base: String,
    pub scryfall_base: String,
    pub gatherer_base: String,
    pub fab_cards_url: String,
    pub fixtures_dir: std::path::PathBuf,
    pub scryfall_bulk: bool,
}

pub async fn run(pool: &SqlitePool, source: SyncSource, opts: SyncOptions) -> Result<SyncReport> {
    let source_name = match source {
        SyncSource::Local => "local",
        SyncSource::Riftdecks => "riftdecks",
        SyncSource::Fixtures => "fixtures",
        SyncSource::Openrift => "openrift",
        SyncSource::Bilgewater => "bilgewater",
        SyncSource::Fabrary => "fabrary",
        SyncSource::Scryfall => "scryfall",
        SyncSource::Gatherer => "gatherer",
        SyncSource::All => "all",
    };

    let run_id = db::begin_sync_run(pool, source_name).await?;
    info!(source = source_name, run_id, "sync started");

    let result = match source {
        SyncSource::Local => local::sync(pool, &opts.fixtures_dir).await,
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
        SyncSource::Bilgewater => {
            bilgewater::sync(pool, &opts.bilgewater_base, opts.delay_ms).await
        }
        SyncSource::Fabrary => fabrary::sync(pool, &opts.fab_cards_url).await,
        SyncSource::Scryfall => {
            scryfall::sync(
                pool,
                &opts.scryfall_base,
                opts.scryfall_bulk,
                opts.delay_ms,
            )
            .await
        }
        SyncSource::Gatherer => {
            gatherer::sync(
                pool,
                &opts.gatherer_base,
                opts.delay_ms,
                opts.max_decks.max(25),
            )
            .await
        }
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
    let mut notes = Vec::new();

    match local::sync(pool, &opts.fixtures_dir).await {
        Ok(r) => {
            report.cards += r.cards;
            report.decks += r.decks;
            notes.push(format!("local: {}", r.message));
        }
        Err(err) => notes.push(format!("local skipped: {err:#}")),
    }

    match openrift::sync(pool, &opts.openrift_base).await {
        Ok(r) => {
            report.cards += r.cards;
            notes.push(format!("openrift: {}", r.message));
        }
        Err(err) => notes.push(format!("openrift skipped: {err:#}")),
    }

    match bilgewater::sync(pool, &opts.bilgewater_base, opts.delay_ms).await {
        Ok(r) => {
            report.cards += r.cards;
            notes.push(format!("bilgewater: {}", r.message));
        }
        Err(err) => notes.push(format!("bilgewater skipped: {err:#}")),
    }

    match fabrary::sync(pool, &opts.fab_cards_url).await {
        Ok(r) => {
            report.cards += r.cards;
            notes.push(format!("fabrary: {}", r.message));
        }
        Err(err) => notes.push(format!("fabrary skipped: {err:#}")),
    }

    match scryfall::sync(pool, &opts.scryfall_base, false, opts.delay_ms).await {
        Ok(r) => {
            report.cards += r.cards;
            notes.push(format!("scryfall: {}", r.message));
        }
        Err(err) => notes.push(format!("scryfall skipped: {err:#}")),
    }

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
        Ok(r) => {
            report.tournaments += r.tournaments;
            report.decks += r.decks;
            report.cards += r.cards;
            notes.push(format!("riftdecks: {}", r.message));
        }
        Err(err) => notes.push(format!("riftdecks skipped: {err:#}")),
    }

    // Always finish with domain corrections.
    if let Ok(r) = domain_fixes::sync(pool).await {
        report.cards += r.cards;
        notes.push(r.message);
    }

    report.message = notes.join(" | ");
    Ok(report)
}
