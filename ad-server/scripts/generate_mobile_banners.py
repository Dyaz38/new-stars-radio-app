#!/usr/bin/env python3
"""Generate missing 320×50 creatives from desktop banners."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal
from app.maintenance.generate_mobile_banners import generate_missing_mobile_banners


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate 320×50 banners from 728×90 creatives.")
    parser.add_argument("--apply", action="store_true", help="Persist changes (default is dry run).")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        summary = generate_missing_mobile_banners(db, dry_run=not args.apply)
        print(f"{'Dry run' if summary.dry_run else 'Generated'}: {len(summary.generated)} campaign(s)")
        for item in summary.generated:
            print(f"  • {item.campaign_name} → {item.creative_name}")
        if summary.skipped:
            print("Skipped:")
            for line in summary.skipped:
                print(f"  • {line}")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
