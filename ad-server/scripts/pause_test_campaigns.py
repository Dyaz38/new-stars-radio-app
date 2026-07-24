#!/usr/bin/env python3
"""
Pause sample/test campaigns so production rotation only serves real advertisers.

Examples matched by default:
  - Starline / Starlink (sample creative names)
  - Campaigns or creatives whose click URL is https://example.com/...

House Promo campaigns are never paused.

Usage:
  cd ad-server
  python scripts/pause_test_campaigns.py              # dry run (default)
  python scripts/pause_test_campaigns.py --apply      # pause matched campaigns
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow `python scripts/pause_test_campaigns.py` from ad-server/
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal
from app.maintenance.pause_test_campaigns import pause_test_campaigns


def main() -> int:
    parser = argparse.ArgumentParser(description="Pause test/sample ad campaigns.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist changes (default is dry run only).",
    )
    args = parser.parse_args()
    dry_run = not args.apply

    db = SessionLocal()
    try:
        summary = pause_test_campaigns(db, dry_run=dry_run)

        print(f"Scanned {summary.scanned} campaign(s).")
        print(f"  Active real campaigns (unchanged): {len(summary.active_real_campaigns)}")
        for name in summary.active_real_campaigns:
            print(f"    • {name}")

        if summary.already_paused:
            print(f"  Already paused test campaigns: {len(summary.already_paused)}")
            for name in summary.already_paused:
                print(f"    • {name}")

        if not summary.paused:
            print("\nNo test campaigns need pausing.")
            return 0

        print(f"\n{'Would pause' if dry_run else 'Pausing'} {len(summary.paused)} test campaign(s):")
        for item in summary.paused:
            print(
                f"  • {item.campaign_name} [{item.previous_status}] — {item.reason}"
            )

        if dry_run:
            print("\nDry run only. Re-run with --apply to pause these campaigns.")
            return 0

        print(f"\nPaused {len(summary.paused)} campaign(s).")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
