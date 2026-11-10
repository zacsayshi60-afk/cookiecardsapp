use std::path::PathBuf;

use clap::{Parser, Subcommand, ValueEnum};

/// Cardessy API — unify Riftbound / FaB / Magic data into one database for your app.
#[derive(Debug, Parser)]
#[command(name = "cardessy", version, about, long_about = None)]
pub struct Cli {
    /// Path to the SQLite database file.
    #[arg(long, env = "CARDESSY_DATABASE", global = true, default_value = "data/cardessy.db")]
    pub database: PathBuf,

    /// Log filter (RUST_LOG style). Example: cardessy=debug,tower_http=info
    #[arg(long, env = "RUST_LOG", global = true, default_value = "cardessy=info,tower_http=info")]
    pub log: String,

    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Debug, Subcommand)]
pub enum Commands {
    /// Start the Cardessy HTTP API.
    Serve {
        /// Bind address.
        #[arg(long, env = "CARDESSY_BIND", default_value = "0.0.0.0:43180")]
        bind: String,
    },

    /// Import data into the local database.
    Sync {
        /// Where to pull data from.
        #[arg(long, value_enum, default_value_t = SyncSource::Local)]
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

        /// Delay between HTTP requests in milliseconds.
        #[arg(long, default_value_t = 750)]
        delay_ms: u64,

        /// Base URL for RiftDecks.
        #[arg(long, env = "RIFTDECKS_BASE_URL", default_value = "https://riftdecks.com")]
        riftdecks_base: String,

        /// Base URL for OpenRift public card API.
        #[arg(long, env = "OPENRIFT_BASE_URL", default_value = "https://openrift.app")]
        openrift_base: String,

        /// Base URL for Bilgewater Market public API.
        #[arg(long, env = "BILGEWATER_BASE_URL", default_value = "https://api.bilgewatermarket.com")]
        bilgewater_base: String,

        /// Base URL for Scryfall API (Magic; Gatherer-aligned oracle data).
        #[arg(long, env = "SCRYFALL_BASE_URL", default_value = "https://api.scryfall.com")]
        scryfall_base: String,

        /// Base URL for Gatherer (legacy Wizards lookup; used for optional enrichment).
        #[arg(long, env = "GATHERER_BASE_URL", default_value = "https://gatherer.wizards.com")]
        gatherer_base: String,

        /// Raw FaB card JSON URL (the-fab-cube dataset that powers Fabrary).
        #[arg(
            long,
            env = "FAB_CARDS_URL",
            default_value = "https://raw.githubusercontent.com/the-fab-cube/flesh-and-blood-cards/develop/json/english/card.json"
        )]
        fab_cards_url: String,

        /// Directory with JSON fixtures.
        #[arg(long, default_value = "fixtures")]
        fixtures_dir: PathBuf,

        /// When syncing Scryfall, also pull full oracle bulk (large download).
        #[arg(long, default_value_t = false)]
        scryfall_bulk: bool,
    },
}

#[derive(Debug, Clone, Copy, ValueEnum)]
pub enum SyncSource {
    /// Offline fixtures (gallery / rathe / magisterium) with domain corrections.
    Local,
    /// Crawl public RiftDecks.com HTML pages (tournaments → decks → cards).
    Riftdecks,
    /// Load original RiftDecks-shaped sample JSON.
    Fixtures,
    /// Pull the public OpenRift card catalog (correct domains).
    Openrift,
    /// Pull Bilgewater Market public card + set catalog / prices.
    Bilgewater,
    /// Pull Flesh and Blood cards (Fabrary / the-fab-cube dataset).
    Fabrary,
    /// Pull Magic cards via Scryfall (Gatherer-aligned oracle text + set/color).
    Scryfall,
    /// Optional Gatherer HTML enrichment for Magic cards that already have multiverse ids.
    Gatherer,
    /// Local fixtures + OpenRift + Bilgewater + Fabrary + Scryfall + best-effort RiftDecks.
    All,
}
