"""
filter_changelog.py — Filter raw Jira changelog.csv to only scheduling-relevant rows.

Usage:
    python3 filter_changelog.py
"""

import csv
from pathlib import Path

csv.field_size_limit(10**7)

INPUT  = Path("/Users/alicialin/Downloads/archive (4)/changelog.csv")
OUTPUT = Path("/Users/alicialin/Downloads/changelog_filtered.csv")

RELEVANT_FIELDS = {"priority", "duedate", "timespent", "timeestimate", "timeoriginalestimate", "status"}
KEEP_COLS = ["key", "author", "created", "field", "fromString", "toString"]

kept = 0
skipped = 0

with open(INPUT, newline="", encoding="utf-8") as fin, \
     open(OUTPUT, "w", newline="", encoding="utf-8") as fout:

    reader = csv.DictReader(fin)
    writer = csv.DictWriter(fout, fieldnames=KEEP_COLS)
    writer.writeheader()

    for row in reader:
        if row.get("field", "").strip().lower() in RELEVANT_FIELDS:
            writer.writerow({col: row.get(col, "") for col in KEEP_COLS})
            kept += 1
        else:
            skipped += 1

        if (kept + skipped) % 500_000 == 0:
            print(f"  processed {kept + skipped:,} rows  (kept {kept:,})...")

print(f"\nDone. Kept {kept:,} rows, skipped {skipped:,}.")
print(f"Saved to: {OUTPUT}")
