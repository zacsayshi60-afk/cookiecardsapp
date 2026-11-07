use std::path::PathBuf;

use clap::{Parser, Subcommand, ValueEnum};

/// Riftbook backend — unify RiftDecks.com data into one database for your app.
#[derive(Debug, Parser)]
#[command(name = "riftbook", version, about, long_about = None)]
pub struct Cli {
    /// Path to the SQLite database file.
    #[arg(long, env = "RIFTBOOK_DATABASE", global = true, default_value = "data/riftbook.db")]
    pub database: PathBuf,

    /// Log filter (RUST_LOG style). Example: riftbook=debug,tower_http=info
    #[arg(long, env = "RUST_LOG", global = true, default_value = "riftbook=info,tower_http=info")]
    pub log: String,

    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Debug, Subcommand)]
pub enum Commands {
    /// Start the HTTP API that the Riftbook app / website can call.
    Serve {
        /// Bind address.
        #[arg(long, env = "RIFTBOOK_BIND", default_value = "0.0.0.0:43180")]
        bind: String,
    },

    /// Import data into the local database.
    Sync {
        /// Where to pull data from.
        #[arg(long, value_enum, default_value_t = SyncSource::Riftdecks)]
        source: SyncSource,

        /// Max tournament list pages to crawl (RiftDecks).
        #[arg(long, default_value_t = 2)]
        tournament_pages: u32,

        /// Max tournaments to fully import per run.
        #[arg(long, default_value_t = 5)]
        max_tournaments: u32,

        /// Max decks to fully import per run.
        #[arg(long, default_value_t = 25)]
        max_decks: u32,

        /// Delay between HTTP requests in milliseconds (be polite to RiftDecks).
        #[arg(long, default_value_t = 750)]
        delay_ms: u64,

        /// Base URL for RiftDecks (override for mirrors / local fixtures HTTP).
        #[arg(long, env = "RIFTDECKS_BASE_URL", default_value = "https://riftdecks.com")]
        riftdecks_base: String,

        /// Base URL for OpenRift public card API.
        #[arg(long, env = "OPENRIFT_BASE_URL", default_value = "https://openrift.app")]
        openrift_base: String,

        /// Directory with JSON fixtures (used by --source fixtures).
        #[arg(long, default_value = "fixtures")]
        fixtures_dir: PathBuf,
    },
}

#[derive(Debug, Clone, Copy, ValueEnum)]
pub enum SyncSource {
    /// Crawl public RiftDecks.com HTML pages (tournaments → decks → cards).
    Riftdecks,
    /// Load sample data that mirrors RiftDecks shapes (offline / CI / Cloudflare blocked).
    Fixtures,
    /// Pull the public OpenRift card catalog to enrich `cards`.
    Openrift,
    /// Fixtures first, then enrich cards from OpenRift when reachable.
    All,
}
