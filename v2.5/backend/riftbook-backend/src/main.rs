mod api;
mod config;
mod db;
mod import;
mod models;

use anyhow::{Context, Result};
use clap::Parser;
use tracing_subscriber::EnvFilter;

use crate::config::{Cli, Commands};
use crate::import::SyncOptions;

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::new(&cli.log))
        .with_target(false)
        .compact()
        .init();

    let pool = db::connect(&cli.database).await?;

    match cli.command {
        Commands::Serve { bind } => {
            let state = api::AppState { pool };
            let app = api::router(state);
            let listener = tokio::net::TcpListener::bind(&bind)
                .await
                .with_context(|| format!("bind {bind}"))?;
            tracing::info!("Riftbook API listening on http://{bind}");
            axum::serve(listener, app)
                .with_graceful_shutdown(shutdown_signal())
                .await?;
        }
        Commands::Sync {
            source,
            tournament_pages,
            max_tournaments,
            max_decks,
            delay_ms,
            riftdecks_base,
            openrift_base,
            fixtures_dir,
        } => {
            let report = import::run(
                &pool,
                source,
                SyncOptions {
                    tournament_pages,
                    max_tournaments,
                    max_decks,
                    delay_ms,
                    riftdecks_base,
                    openrift_base,
                    fixtures_dir,
                },
            )
            .await?;
            println!(
                "sync ok — tournaments={} decks={} cards={}\n{}",
                report.tournaments, report.decks, report.cards, report.message
            );
        }
    }

    Ok(())
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
    tracing::info!("shutdown signal received");
}
