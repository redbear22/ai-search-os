"""SQLite schema migrations."""

from __future__ import annotations

from db.connection import get_conn

MIGRATION_001 = "asos_001_initial"


def _apply_initial(cur) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        )
        """
    )
    cur.execute("SELECT 1 FROM schema_migrations WHERE version = ?", (MIGRATION_001,))
    if cur.fetchone():
        return

    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS app_config (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS project_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT 'Default',
            domain TEXT DEFAULT '',
            voice_notes TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS content_gaps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_profile_id INTEGER NOT NULL DEFAULT 1,
            keyword TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            priority INTEGER DEFAULT 50,
            reasoning TEXT DEFAULT '',
            source TEXT DEFAULT 'manual',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS briefs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gap_id INTEGER,
            keyword TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            outline_json TEXT DEFAULT '[]',
            faq_json TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brief_id INTEGER,
            keyword TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            html_body TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS agent_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            graph_name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            input_json TEXT DEFAULT '{}',
            output_json TEXT DEFAULT '{}',
            error TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS multi_engine_intent_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT NOT NULL,
            report_json TEXT NOT NULL,
            source TEXT DEFAULT 'rules',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS competitive_audit_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT NOT NULL,
            report_json TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        INSERT OR IGNORE INTO project_profiles (id, name, domain)
        VALUES (1, 'Default', 'example.com');
        """
    )

    cur.execute(
        "INSERT INTO schema_migrations(version, applied_at) VALUES (?, datetime('now'))",
        (MIGRATION_001,),
    )


def run_migrations(db_path: str) -> None:
    conn = get_conn(db_path)
    try:
        cur = conn.cursor()
        _apply_initial(cur)
        conn.commit()
    finally:
        conn.close()
