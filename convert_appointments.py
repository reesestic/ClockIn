"""
convert_appointments.py — Convert appointments.csv to simulate.py changelog format.

Each "correction pair" is:
  patient cancels/misses one appointment  →  later attends another
  = implicit scheduling preference: rejected the earlier slot, accepted the later one

Output columns (simulate.py format):
  key        appointment_id of the ACCEPTED appointment
  author     patient_id
  created    scheduling_date of the ACCEPTED appointment
  field      appointment_time   (the field that changed)
  fromString rejected appointment_time  (cancelled/did-not-attend slot)
  toString   accepted appointment_time

Usage:
  python3 convert_appointments.py
  python3 convert_appointments.py --input appointments.csv --output appt_changelog.csv
  python3 convert_appointments.py --max-gap 90   # only pair events within 90 days (default: 30)
"""

import argparse
import csv
from datetime import date, datetime, timedelta
from pathlib import Path


REJECT_STATUSES = {"cancelled", "did not attend"}
ACCEPT_STATUSES = {"attended"}


def parse_date(s: str) -> date | None:
    try:
        return datetime.strptime(s.strip(), "%Y-%m-%d").date()
    except Exception:
        return None


def load_appointments(path: Path) -> dict[str, list[dict]]:
    """Load CSV, group rows by patient_id, sort each group by scheduling_date."""
    patients: dict[str, list[dict]] = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = row["patient_id"].strip()
            d = parse_date(row["scheduling_date"])
            if d is None:
                continue
            row["_sched_date"] = d
            patients.setdefault(pid, []).append(row)

    for pid in patients:
        patients[pid].sort(key=lambda r: r["_sched_date"])

    return patients


def extract_pairs(patients: dict[str, list[dict]], max_gap_days: int) -> list[dict]:
    """
    For each patient, find (reject, accept) pairs where:
      - reject status ∈ REJECT_STATUSES
      - accept status ∈ ACCEPT_STATUSES
      - accept scheduling_date > reject scheduling_date
      - gap ≤ max_gap_days
      - appointment_time differs (otherwise no scheduling preference signal)

    Each rejected appointment can match at most one accepted appointment
    (greedy forward match).
    """
    max_gap = timedelta(days=max_gap_days)
    pairs = []

    for pid, appts in patients.items():
        used_accepts: set[str] = set()

        for i, rej in enumerate(appts):
            if rej["status"] not in REJECT_STATUSES:
                continue
            rej_time = rej["appointment_time"].strip()
            rej_date = rej["_sched_date"]

            # Search forward for first eligible accepted appointment
            for acc in appts[i + 1:]:
                if acc["appointment_id"] in used_accepts:
                    continue
                if acc["status"] not in ACCEPT_STATUSES:
                    continue
                acc_date = acc["_sched_date"]
                if acc_date > rej_date + max_gap:
                    break  # sorted, so nothing later will be within gap
                acc_time = acc["appointment_time"].strip()
                if acc_time == rej_time:
                    continue  # no scheduling preference if time is identical

                used_accepts.add(acc["appointment_id"])
                pairs.append({
                    "key":        acc["appointment_id"],
                    "author":     pid,
                    "created":    str(acc_date),
                    "field":      "appointment_time",
                    "fromString": rej_time,
                    "toString":   acc_time,
                    # extra context columns (ignored by simulate.py but useful)
                    "_rej_status":   rej["status"],
                    "_rej_date":     str(rej_date),
                    "_rej_interval": rej["scheduling_interval"],
                    "_acc_interval": acc["scheduling_interval"],
                    "_duration":     acc["appointment_duration"],
                })
                break  # one match per rejected appointment

    return pairs


def write_changelog(pairs: list[dict], path: Path) -> None:
    fieldnames = ["key", "author", "created", "field", "fromString", "toString"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(pairs)


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert appointments.csv to simulate.py changelog format")
    parser.add_argument("--input",    default="appointments.csv", help="Path to appointments.csv")
    parser.add_argument("--output",   default="appt_changelog.csv", help="Output changelog CSV")
    parser.add_argument("--max-gap",  type=int, default=30,
                        help="Max days between rejected and accepted scheduling_date (default: 30)")
    args = parser.parse_args()

    input_path  = Path(args.input)
    output_path = Path(args.output)

    print(f"Loading {input_path} ...")
    patients = load_appointments(input_path)
    total_appts = sum(len(v) for v in patients.values())
    print(f"  {total_appts:,} appointments  |  {len(patients):,} patients")

    print(f"Extracting correction pairs (max gap = {args.max_gap} days) ...")
    pairs = extract_pairs(patients, args.max_gap)
    print(f"  {len(pairs):,} pairs extracted")

    if not pairs:
        print("No pairs found — try increasing --max-gap")
        return

    write_changelog(pairs, output_path)
    print(f"Written to {output_path}")

    # Quick stats
    from collections import Counter
    fields = Counter(p["field"] for p in pairs)
    authors = len({p["author"] for p in pairs})
    print(f"\nStats:")
    print(f"  Unique patients with ≥1 correction pair: {authors:,}")
    print(f"  Fields: {dict(fields)}")
    print(f"\nRun simulate.py:")
    print(f"  python3 simulate.py --csv {output_path} --clean")
    print(f"  python3 simulate.py --csv {output_path} --clean --sample 2000")


if __name__ == "__main__":
    main()
