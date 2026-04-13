"""
simulate.py — ClockIn scheduling pipeline simulation.

Full pipeline (mirrors backend exactly):
  changelog row → OpenAI gpt-4o-mini (interprets correction semantically,
                    returns priority_norm, urgency_norm, duration_fit,
                    + latent_vars: cognitive_load, context_switch_cost)
               → FeatureValidator (author history ≥2, direction consistency ≥50%,
                    confidence ≥0.65 — stateful per author)
               → Online Perceptron with exponential time decay (λ=0.01, lr=0.1,
                    L2 regularisation; replaces LogisticRegression for scheduling)

  LogisticRegression is retained only for classification metrics reporting.

Usage:
    python3 simulate.py --csv /path/to/changelog_filtered.csv --sample 500
    python3 simulate.py --no-openai   # rule-based fallback (NOT paper-comparable)
"""

import argparse
import asyncio
import csv
import json
import os
import statistics
import sys
from collections import defaultdict
from datetime import datetime
from math import exp
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score

# ── Backend imports ───────────────────────────────────────────────────────────
# simulate.py is an integration test of the real backend pipeline.
# All feature extraction, validation, and perceptron logic come from the backend.
sys.path.insert(0, str(Path(__file__).parent / "backend"))
from services.interpretation_service import InterpretationService                    # noqa: E402
from services.feature_validator import FeatureValidator                              # noqa: E402
from services.ml_service import MLService, DECAY_LAMBDA, LEARNING_RATE              # noqa: E402
from services.feature_discovery_service import sanitize_latent_key                  # noqa: E402

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

load_dotenv(Path(__file__).parent / "backend" / ".env")
csv.field_size_limit(10**7)

RANDOM_SEED            = 42
np.random.seed(RANDOM_SEED)
DEFAULT_WEIGHTS        = {"priority": 0.4, "urgency": 0.4, "duration_fit": 0.2}
BASE_FEATURE_KEYS      = ["priority", "urgency", "duration_fit"]
RELEVANT_FIELDS        = {"priority", "duedate", "timespent", "timeestimate", "timeoriginalestimate", "status", "appointment_time"}
MIN_EVENTS_PER_AUTHOR  = 5
MAX_CONCURRENT_OPENAI  = 20
OPENAI_MAX_RETRIES     = 3
SIM_PROMOTION_THRESHOLD = 20  # a latent key must appear in ≥ this many accepted events to be promoted

# ─────────────────────────────────────────────────────────────────────────────
# DOMAIN MAPPINGS
# ─────────────────────────────────────────────────────────────────────────────

PRIORITY_SCORE = {"blocker": 1.0, "critical": 0.9, "major": 0.7,
                  "medium": 0.5, "minor": 0.3, "trivial": 0.1}

STATUS_ORDER = {"to do": 0, "open": 0, "in progress": 1, "done": 2,
                "closed": 2, "resolved": 2, "reopened": 0.5,
                "won't fix": 2, "wont fix": 2}

MAX_TIME_SECS = 40 * 3600

FIELD_NUDGE_DIM = {
    "priority": "priority",
    "timespent": "duration_fit", "timeestimate": "duration_fit",
    "timeoriginalestimate": "duration_fit",
    "status": "urgency", "duedate": "urgency",
}

# ─────────────────────────────────────────────────────────────────────────────
# In-memory repo — satisfies MLService's perceptron read/write interface
# without needing Supabase. Used for per-author state during simulation.
# ─────────────────────────────────────────────────────────────────────────────

class _InMemoryRepo:
    def __init__(self):
        self._weights: dict = {}

    def get_perceptron_weights(self, user_id) -> dict | None:
        return self._weights.get(str(user_id))

    def save_perceptron_weights(self, user_id, weights: dict) -> None:
        self._weights[str(user_id)] = weights


# ─────────────────────────────────────────────────────────────────────────────
# In-simulation feature discovery — mirrors FeatureDiscoveryService but uses
# an in-memory counter rather than Supabase RPC calls.
# ─────────────────────────────────────────────────────────────────────────────

class _SimFeatureDiscovery:
    """
    Counts how often each latent key appears across accepted events.
    After all events are loaded, call compute_promoted(threshold) to get the
    list of keys that appear frequently enough to become perceptron dimensions.
    """

    def __init__(self):
        self._counts: dict[str, int] = defaultdict(int)
        self._promoted: list[str] = []

    def record(self, latent_vars: dict) -> None:
        for key, val in latent_vars.items():
            if val is None:
                continue
            safe = sanitize_latent_key(key)
            if safe:
                self._counts[safe] += 1

    def compute_promoted(self, threshold: int) -> list[str]:
        self._promoted = sorted(k for k, c in self._counts.items() if c >= threshold)
        return self._promoted

    @property
    def promoted_keys(self) -> list[str]:
        return self._promoted

    @property
    def key_counts(self) -> dict[str, int]:
        return dict(self._counts)


# ─────────────────────────────────────────────────────────────────────────────
# Jira-specific direction helper
# (field/from_val/to_val are Jira strings; direction is passed to the backend
# FeatureValidator which is field-type-agnostic)
# ─────────────────────────────────────────────────────────────────────────────

def _jira_direction(field: str, from_val: str, to_val: str) -> str | None:
    f = field.lower()
    if f == "priority":
        fs = PRIORITY_SCORE.get(from_val.lower())
        ts = PRIORITY_SCORE.get(to_val.lower())
        if fs is None or ts is None:
            return None
        return "up" if ts > fs else ("down" if ts < fs else None)
    if f in ("timespent", "timeestimate", "timeoriginalestimate"):
        try:
            fv, tv = float(from_val), float(to_val)
            return "up" if tv > fv else ("down" if tv < fv else None)
        except ValueError:
            return None
    if f == "status":
        fo  = STATUS_ORDER.get(from_val.lower())
        to_ = STATUS_ORDER.get(to_val.lower())
        if fo is None or to_ is None:
            return None
        return "forward" if to_ > fo else ("backward" if to_ < fo else None)
    if f == "appointment_time":
        # HH:MM:SS or HH:MM — earlier/later in day
        try:
            from datetime import time as _time
            def _parse_t(s):
                parts = s.strip().split(":")
                return int(parts[0]) * 60 + int(parts[1])
            fv, tv = _parse_t(from_val), _parse_t(to_val)
            return "earlier" if tv < fv else ("later" if tv > fv else None)
        except Exception:
            return None
    return None  # duedate — ambiguous, backend validator skips direction check


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1b — Rule-based fallback (--no-openai only)
# ─────────────────────────────────────────────────────────────────────────────

def _rule_based_features(field: str, value: str) -> dict | None:
    f = field.strip().lower()
    v = value.strip()
    if f == "priority":
        s = PRIORITY_SCORE.get(v.lower())
        return {"priority_norm": s, "urgency_norm": s, "duration_fit": 0.5} if s else None
    if f == "status":
        s = STATUS_ORDER.get(v.lower())
        if s is None:
            return None
        s_norm = s / 2.0
        return {"priority_norm": s_norm, "urgency_norm": s_norm, "duration_fit": 0.5}
    if f in ("timespent", "timeestimate", "timeoriginalestimate"):
        try:
            s = min(float(v) / MAX_TIME_SECS, 1.0)
            return {"priority_norm": 0.5, "urgency_norm": 0.3, "duration_fit": s}
        except ValueError:
            return None
    if f == "duedate":
        from datetime import datetime
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
            try:
                s = datetime.strptime(v, fmt).weekday() / 6.0
                return {"priority_norm": 0.5, "urgency_norm": s, "duration_fit": s}
            except ValueError:
                continue
    if f == "appointment_time":
        # Map time-of-day to duration_fit (mirrors ml_service._features_from_event)
        try:
            parts = v.split(":")
            hour = int(parts[0])
            if 18 <= hour < 24:
                df = 1.0
            elif 15 <= hour < 18:
                df = 0.7
            elif 12 <= hour < 15:
                df = 0.5
            else:
                df = 0.2
            urgency = min(hour / 23.0, 1.0)
            return {"priority_norm": 0.5, "urgency_norm": urgency, "duration_fit": df}
        except Exception:
            return None
    return None


# ─────────────────────────────────────────────────────────────────────────────
# DATASET LOADING
# FIX (Issue 1): sorts by created, passes author/field/confidence to validator
# FIX (Issue 4): no silent OpenAI fallback; skipped rows are logged and dropped
# ─────────────────────────────────────────────────────────────────────────────

CLEAN_FIELDS = {"priority", "duedate", "due_date", "appointment_time"}


async def load_events(
    path: Path,
    sample_size: int | None,
    interpreter,
    validator: FeatureValidator,
    use_openai: bool,
    clean: bool = False,
) -> tuple[list[dict], list[str], list[tuple]]:
    """
    Returns:
      events     — validated event pairs (rejected + accepted) for perceptron
      reasonings — OpenAI reasoning strings
      raw_pairs  — ALL (orig_vec, corr_vec) before validation (for Baseline C)

    When clean=True, only rows whose field is in CLEAN_FIELDS
    {'priority', 'duedate', 'due_date'} are kept. This removes timespent/status
    noise that represents task completion rather than scheduling preference.
    """
    allowed = CLEAN_FIELDS if clean else RELEVANT_FIELDS
    raw_rows = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("field", "").strip().lower() not in allowed:
                continue
            if row.get("fromString", "").strip() == row.get("toString", "").strip():
                continue
            raw_rows.append(row)
            if sample_size and len(raw_rows) >= sample_size:
                break

    # Sort chronologically — validator conditions depend on order
    raw_rows.sort(key=lambda r: r.get("created", ""))
    if clean:
        print(f"      --clean active: fields restricted to {sorted(CLEAN_FIELDS)}")
    print(f"      {len(raw_rows):,} relevant rows loaded (sorted chronologically)")

    if interpreter:
        unique_combos = {
            (r["field"], r.get("fromString", ""), r.get("toString", ""))
            for r in raw_rows
        }
        print(f"      {len(unique_combos):,} unique (field, from→to) combos → sending to OpenAI...")
        tasks   = [interpreter.interpret_change(f, fr, to) for f, fr, to in unique_combos]
        results = await asyncio.gather(*tasks)
        combo_map = {
            combo: result
            for combo, result in zip(unique_combos, results)
            if result is not None
        }
        print(f"      {len(combo_map):,} successful interpretations "
              f"({len(interpreter.skipped):,} skipped after {OPENAI_MAX_RETRIES} retries)")
    else:
        combo_map = None

    events: list[dict] = []
    reasonings: list[str] = []
    raw_pairs: list[tuple] = []

    for row in raw_rows:
        field    = row["field"].strip()
        from_val = row.get("fromString", "").strip()
        to_val   = row.get("toString",   "").strip()
        author   = row.get("author",  "unknown").strip()
        created  = row.get("created", "").strip()
        key      = row.get("key",     "").strip()

        if combo_map is not None:
            # OpenAI mode — no silent fallback
            interp = combo_map.get((field, from_val, to_val))
            if interp is None:
                continue  # was skipped due to OpenAI failure
            original   = interp.get("original",   {})
            corrected  = interp.get("corrected",  {})
            reasoning  = interp.get("reasoning",  "")
            raw_conf   = interp.get("confidence")
            confidence = float(raw_conf) if isinstance(raw_conf, (int, float)) else None
        else:
            original   = _rule_based_features(field, from_val)
            corrected  = _rule_based_features(field, to_val)
            reasoning  = ""
            confidence = None
            if original is None or corrected is None:
                continue

        # Track raw pair before validation (for Baseline C)
        has_keys = (FeatureValidator.REQUIRED_KEYS.issubset(original.keys()) and
                    FeatureValidator.REQUIRED_KEYS.issubset(corrected.keys()))
        if has_keys:
            raw_pairs.append((
                FeatureValidator.to_vector(original),
                FeatureValidator.to_vector(corrected),
            ))

        # STEP 2: ML validator gate (backend FeatureValidator)
        # Compute Jira-specific direction, then delegate to the backend class
        direction = _jira_direction(field, from_val, to_val)
        conf_val  = confidence if (use_openai and confidence is not None) else None
        passed, _ = validator.validate(
            original, corrected,
            author, field.lower(), direction, conf_val,
        )
        if not passed:
            continue

        if reasoning:
            reasonings.append(reasoning)

        latent_vars = interp.get("latent_vars", {}) if combo_map is not None else {}
        if not isinstance(latent_vars, dict):
            latent_vars = {}
        # Sanitize latent keys before storing
        latent_vars = {sanitize_latent_key(k): v
                       for k, v in latent_vars.items()
                       if sanitize_latent_key(k) and v is not None}

        base = {"key": key, "author": author, "created": created,
                "field": field, "confidence": confidence}
        events.append({**base, "features": FeatureValidator.to_vector(original),
                       "action": "rejected", "latent_vars": latent_vars})
        events.append({**base, "features": FeatureValidator.to_vector(corrected),
                       "action": "accepted", "latent_vars": latent_vars})

    # Debug if validator rejected nothing
    total_seen = validator.accepted_count + validator.rejected_count
    if total_seen > 0 and validator.rejected_count == 0:
        print("\n  DEBUG: Validator rejected 0 corrections. First 10 decisions:")
        for line in validator._debug_log:
            print(f"    {line}")

    return events, reasonings, raw_pairs


# ─────────────────────────────────────────────────────────────────────────────
# DYNAMIC FEATURE EXPANSION
# ─────────────────────────────────────────────────────────────────────────────

def _expand_event_features(events: list[dict], promoted_keys: list[str]) -> list[dict]:
    """
    Extends each event's feature vector from 3D to 3+N by appending the values
    of promoted latent keys (0.0 if the event doesn't have that key).
    Mutates events in-place and returns the list.
    """
    if not promoted_keys:
        return events
    for ev in events:
        latent = ev.get("latent_vars", {}) or {}
        extra  = [float(latent.get(k) or 0.0) for k in promoted_keys]
        ev["features"] = list(ev["features"]) + extra
    return events


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Perceptron (LogisticRegression)
# ─────────────────────────────────────────────────────────────────────────────

def train_perceptron(events: list[dict]) -> tuple[LogisticRegression, np.ndarray, np.ndarray]:
    X = np.array([e["features"] for e in events])
    y = np.array([1 if e["action"] == "accepted" else 0 for e in events])
    model = LogisticRegression(random_state=RANDOM_SEED, max_iter=1000)
    model.fit(X, y)
    return model, X, y


def get_learned_weights(model: LogisticRegression,
                        feature_keys: list[str] | None = None) -> dict:
    if feature_keys is None:
        feature_keys = BASE_FEATURE_KEYS
    coefs = model.coef_[0]
    total = sum(abs(c) for c in coefs) or 1
    return {k: round(abs(coefs[i]) / total, 4) for i, k in enumerate(feature_keys)}


# ─────────────────────────────────────────────────────────────────────────────
# METRICS
# ─────────────────────────────────────────────────────────────────────────────

def compute_metrics(model: LogisticRegression, X: np.ndarray, y: np.ndarray) -> dict:
    y_pred    = model.predict(X)
    y_prob    = model.predict_proba(X)[:, 1]
    cv        = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)
    cv_scores = cross_val_score(model, X, y, cv=cv, scoring="roc_auc")
    return {
        "n_samples":             len(y),
        "class_balance":         {"accepted": int(y.sum()), "rejected": int((y == 0).sum())},
        "accuracy":              round(accuracy_score(y, y_pred), 4),
        "precision":             round(precision_score(y, y_pred, zero_division=0), 4),
        "recall":                round(recall_score(y, y_pred, zero_division=0), 4),
        "f1":                    round(f1_score(y, y_pred, zero_division=0), 4),
        "roc_auc":               round(roc_auc_score(y, y_prob), 4),
        "cv_roc_auc_mean":       round(cv_scores.mean(), 4),
        "cv_roc_auc_std":        round(cv_scores.std(), 4),
        "confusion_matrix":      confusion_matrix(y, y_pred).tolist(),
        "classification_report": classification_report(y, y_pred, target_names=["rejected", "accepted"]),
    }


# ─────────────────────────────────────────────────────────────────────────────
# PERSONAS
# ─────────────────────────────────────────────────────────────────────────────

PERSONA_LABELS = {
    "priority": "Priority Corrector", "duedate": "Deadline Corrector",
    "timespent": "Time Corrector", "timeestimate": "Time Corrector",
    "timeoriginalestimate": "Time Corrector", "status": "Status Corrector",
}


def build_personas(events: list[dict]) -> dict:
    author_fields = defaultdict(lambda: defaultdict(int))
    author_events = defaultdict(list)
    for e in events:
        author_fields[e["author"]][e["field"].lower()] += 1
        author_events[e["author"]].append(e)
    personas = {}
    for author, field_counts in author_fields.items():
        total = sum(field_counts.values()) // 2
        if total < MIN_EVENTS_PER_AUTHOR:
            continue
        dominant = max(field_counts, key=field_counts.get)
        personas[author] = {
            "label":             PERSONA_LABELS.get(dominant, "General Corrector"),
            "dominant_field":    dominant,
            "total_corrections": total,
            "events":            author_events[author],
        }
    return personas


def compute_persona_metrics(personas: dict) -> list[dict]:
    results = []
    for author, pdata in personas.items():
        pevents = pdata["events"]
        if len(set(e["action"] for e in pevents)) < 2:
            continue
        X_p = np.array([e["features"] for e in pevents])
        y_p = np.array([1 if e["action"] == "accepted" else 0 for e in pevents])
        try:
            m = LogisticRegression(random_state=RANDOM_SEED, max_iter=500)
            m.fit(X_p, y_p)
            results.append({
                "author":          author[:8] + "...",
                "persona":         pdata["label"],
                "dominant_field":  pdata["dominant_field"],
                "n_corrections":   pdata["total_corrections"],
                "accuracy":        round(accuracy_score(y_p, m.predict(X_p)), 4),
                "learned_weights": get_learned_weights(m),
            })
        except Exception:
            continue
    return sorted(results, key=lambda x: x["n_corrections"], reverse=True)


# ─────────────────────────────────────────────────────────────────────────────
# PAIR BUILDER (shared by simulation + baselines)
# ─────────────────────────────────────────────────────────────────────────────

def build_pairs(events: list[dict]) -> list[tuple]:
    pair_map = defaultdict(lambda: {"rejected": None, "accepted": None})
    for e in events:
        pair_map[(e["key"], e["created"], e["field"])][e["action"]] = e
    return [
        (v["rejected"], v["accepted"])
        for v in pair_map.values()
        if v["rejected"] and v["accepted"]
    ]


# ─────────────────────────────────────────────────────────────────────────────
# SCHEDULING SIMULATION
# ─────────────────────────────────────────────────────────────────────────────

def score_slot(features: list[float], weights: dict,
               feature_keys: list[str] | None = None) -> float:
    if feature_keys is None:
        feature_keys = BASE_FEATURE_KEYS
    return round(sum(weights.get(k, 0.0) * v
                     for k, v in zip(feature_keys, features)), 4)


def simulate_scheduling(events: list[dict], learned: dict,
                        feature_keys: list[str] | None = None) -> dict:
    if feature_keys is None:
        feature_keys = BASE_FEATURE_KEYS
    pairs = build_pairs(events)
    if not pairs:
        return {}
    default_correct = learned_correct = 0
    improvements = []
    for rejected, accepted in pairs:
        rf, af    = rejected["features"], accepted["features"]
        d_gap     = score_slot(af, DEFAULT_WEIGHTS, feature_keys) - score_slot(rf, DEFAULT_WEIGHTS, feature_keys)
        l_gap     = score_slot(af, learned,         feature_keys) - score_slot(rf, learned,         feature_keys)
        if d_gap > 0: default_correct += 1
        if l_gap > 0: learned_correct += 1
        improvements.append(l_gap - d_gap)
    n = len(pairs)
    return {
        "n_pairs":              n,
        "default_accuracy":     round(default_correct / n, 4),
        "learned_accuracy":     round(learned_correct / n, 4),
        "accuracy_improvement": round((learned_correct - default_correct) / n, 4),
        "avg_score_delta":      round(statistics.mean(improvements), 6),
        "pct_pairs_improved":   round(sum(1 for x in improvements if x > 0) / n, 4),
    }


# ─────────────────────────────────────────────────────────────────────────────
# BASELINE COMPARISON  (Issue 3)
# ─────────────────────────────────────────────────────────────────────────────

def compute_baselines(
    pairs:        list[tuple],
    events:       list[dict],
    learned:      dict,
    raw_pairs:    list[tuple],
    feature_keys: list[str] | None = None,
) -> dict:
    if feature_keys is None:
        feature_keys = BASE_FEATURE_KEYS
    if not pairs:
        return {}
    n = len(pairs)

    # A — Full pipeline (learned weights already computed)
    a_correct = sum(
        1 for r, a in pairs
        if score_slot(a["features"], learned, feature_keys) > score_slot(r["features"], learned, feature_keys)
    )

    # B — Rule-based only (DEFAULT_WEIGHTS, never updated)
    b_correct = sum(
        1 for r, a in pairs
        if score_slot(a["features"], DEFAULT_WEIGHTS, feature_keys) > score_slot(r["features"], DEFAULT_WEIGHTS, feature_keys)
    )

    # C — Perceptron only (online update on ALL raw pairs, no validator/OpenAI gate)
    w_c = np.array([DEFAULT_WEIGHTS["priority"], DEFAULT_WEIGHTS["urgency"], DEFAULT_WEIGHTS["duration_fit"]])
    for orig_feat, corr_feat in raw_pairs:
        w_c  = w_c + np.array(corr_feat) - np.array(orig_feat)
        w_c  = np.clip(w_c, 0, None)
        s    = w_c.sum() or 1
        w_c /= s
    w_c_d = {"priority": float(w_c[0]), "urgency": float(w_c[1]), "duration_fit": float(w_c[2])}
    c_correct = sum(
        1 for r, a in pairs
        if score_slot(a["features"], w_c_d, BASE_FEATURE_KEYS) > score_slot(r["features"], w_c_d, BASE_FEATURE_KEYS)
    )

    # D — OpenAI gate only (nudge weights when confidence ≥ 0.65, no perceptron)
    w_d = dict(DEFAULT_WEIGHTS)
    for e in events:
        if e["action"] == "accepted":
            conf = e.get("confidence")
            if isinstance(conf, float) and conf >= 0.65:
                dim = FIELD_NUDGE_DIM.get(e["field"].lower())
                if dim:
                    w_d[dim] = min(w_d[dim] + 0.05, 1.0)
                    total    = sum(w_d.values()) or 1
                    w_d      = {k: v / total for k, v in w_d.items()}
    d_correct = sum(
        1 for r, a in pairs
        if score_slot(a["features"], w_d, feature_keys) > score_slot(r["features"], w_d, feature_keys)
    )

    # Weight vector confirmation
    print(f"  Baseline weight vectors:")
    print(f"    A (full pipeline): P={learned['priority']:.4f}  U={learned['urgency']:.4f}  D={learned['duration_fit']:.4f}")
    print(f"    B (rule-based):    P={DEFAULT_WEIGHTS['priority']:.4f}  U={DEFAULT_WEIGHTS['urgency']:.4f}  D={DEFAULT_WEIGHTS['duration_fit']:.4f}")
    print(f"    C (perceptron):    P={w_c_d['priority']:.4f}  U={w_c_d['urgency']:.4f}  D={w_c_d['duration_fit']:.4f}")
    print(f"    D (openai-gate):   P={w_d['priority']:.4f}  U={w_d['urgency']:.4f}  D={w_d['duration_fit']:.4f}")

    # Debug: first 5 slot pairs
    print(f"\n  DEBUG — first 5 slot pairs:")
    for idx, (r, a) in enumerate(pairs[:5]):
        rf, af = r["features"], a["features"]
        sa_a = score_slot(af, learned,        feature_keys);      sa_r = score_slot(rf, learned,        feature_keys)
        sb_a = score_slot(af, DEFAULT_WEIGHTS, feature_keys);     sb_r = score_slot(rf, DEFAULT_WEIGHTS, feature_keys)
        sc_a = score_slot(af, w_c_d,          BASE_FEATURE_KEYS); sc_r = score_slot(rf, w_c_d,          BASE_FEATURE_KEYS)
        print(f"  Pair {idx+1}:")
        print(f"    phi(rejected) = {[round(x,4) for x in rf]}   phi(accepted) = {[round(x,4) for x in af]}")
        print(f"    A: rejected={sa_r:.4f}  accepted={sa_a:.4f}  winner={'accepted' if sa_a>sa_r else 'rejected'}  (ground truth: accepted)")
        print(f"    B: rejected={sb_r:.4f}  accepted={sb_a:.4f}  winner={'accepted' if sb_a>sb_r else 'rejected'}  (ground truth: accepted)")
        print(f"    C: rejected={sc_r:.4f}  accepted={sc_a:.4f}  winner={'accepted' if sc_a>sc_r else 'rejected'}  (ground truth: accepted)")

    accs = {
        "A_full_pipeline":   a_correct / n,
        "B_rule_based":      b_correct / n,
        "C_perceptron_only": c_correct / n,
        "D_openai_gate":     d_correct / n,
    }
    best_bl = max(["B_rule_based", "C_perceptron_only", "D_openai_gate"], key=lambda k: accs[k])
    bl_names = {
        "A_full_pipeline":   "Full pipeline (ours)",
        "B_rule_based":      "Rule-based only",
        "C_perceptron_only": "Perceptron only",
        "D_openai_gate":     "OpenAI gate only",
    }
    return {
        "n_pairs": n,
        "A_full_pipeline":   {"accuracy": round(accs["A_full_pipeline"],   4), "vs_default": round(accs["A_full_pipeline"]   - accs["B_rule_based"], 4)},
        "B_rule_based":      {"accuracy": round(accs["B_rule_based"],      4), "vs_default": 0.0},
        "C_perceptron_only": {"accuracy": round(accs["C_perceptron_only"], 4), "vs_default": round(accs["C_perceptron_only"] - accs["B_rule_based"], 4)},
        "D_openai_gate":     {"accuracy": round(accs["D_openai_gate"],     4), "vs_default": round(accs["D_openai_gate"]     - accs["B_rule_based"], 4)},
        "best_method":       bl_names[best_bl],
        "our_improvement_over_best_baseline": round(accs["A_full_pipeline"] - accs[best_bl], 4),
    }


# ─────────────────────────────────────────────────────────────────────────────
# CONVERGENCE ANALYSIS  (Issue 2)
# ─────────────────────────────────────────────────────────────────────────────

def compute_convergence(
    events: list[dict], personas: dict, ml: MLService,
    min_corrections: int = 8, learning_rate: float = 0.1,
    feature_keys: list[str] | None = None,
) -> dict:
    if feature_keys is None:
        feature_keys = BASE_FEATURE_KEYS
    from numpy.linalg import norm

    author_accepted = defaultdict(list)
    for e in events:
        if e["action"] == "accepted":
            author_accepted[e["author"]].append(e)

    qualifying = {
        a: sorted(evs, key=lambda e: e.get("created", ""))
        for a, evs in author_accepted.items()
        if len(evs) >= min_corrections
    }

    warned = False
    if len(qualifying) < 2 and min_corrections > 5:
        print(f"  WARNING: Fewer than 2 authors with ≥{min_corrections} corrections. "
              f"Lowering threshold to 5.")
        min_corrections = 5
        qualifying = {
            a: sorted(evs, key=lambda e: e.get("created", ""))
            for a, evs in author_accepted.items()
            if len(evs) >= min_corrections
        }
        warned = True

    rejected_lookup = {
        (e["key"], e["created"], e["field"]): e
        for e in events if e["action"] == "rejected"
    }

    curves: dict = {}
    for author, evs in qualifying.items():
        if author not in personas:
            continue
        pdata = personas[author]

        # 80/20 chronological split
        split_idx  = max(1, int(len(evs) * 0.8))
        train_evs  = evs[:split_idx]
        test_evs   = evs[split_idx:]

        if len(test_evs) < 2:
            continue  # not enough held-out data for a reliable centroid

        # Ground truth centroid = mean of HELD-OUT 20% accepted features (normalised)
        test_vecs = np.array([ev["features"] for ev in test_evs])
        centroid  = test_vecs.mean(axis=0)
        c_norm    = norm(centroid)
        if c_norm == 0:
            continue
        centroid /= c_norm

        # Online perceptron replay on TRAIN 80% only — calls backend MLService directly
        repo = _InMemoryRepo()
        sims = []
        ts_list = [_parse_created(ev.get("created", "")) for ev in train_evs]
        ts0     = next((t for t in ts_list if t is not None), None)

        for i, ev in enumerate(train_evs):
            rej = rejected_lookup.get((ev["key"], ev["created"], ev["field"]))
            if rej:
                phi_a = ev["features"]
                phi_r = rej["features"]
                ml.perceptron_update(
                    author, phi_a, phi_r,
                    datetime.now(),
                    repo,
                    reference_days=0,  # no-decay for convergence baseline curve
                    feature_keys=feature_keys,
                )
            stored = repo.get_perceptron_weights(author)
            if stored:
                w = np.array([stored["priority"], stored["urgency"], stored["duration_fit"]])
                n_w = norm(w)
                if n_w > 0:
                    sim = float(np.dot(w, centroid) / n_w)
                    sims.append(round(max(0.0, min(1.0, sim)), 4))

        if sims:
            curves[author] = {"sims": sims, "persona": pdata["label"]}

    return {
        "n_qualifying":     len(qualifying),
        "threshold_used":   min_corrections,
        "threshold_warned": warned,
        "curves":           curves,
    }


def plot_convergence(convergence_data: dict) -> dict:
    if not HAS_MATPLOTLIB:
        print("  WARNING: matplotlib not installed. Run: pip3 install matplotlib")
        return {}

    curves = convergence_data.get("curves", {})
    if not curves:
        print("  No qualifying authors for convergence plot.")
        return {}

    colors = ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd",
              "#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf"]

    fig, ax = plt.subplots(figsize=(10, 6), facecolor="white")
    ax.set_facecolor("white")
    ax.axhline(y=0.85, color="red",  linestyle="--", linewidth=1.5, alpha=0.85,
               label="Personalization threshold (0.85)")
    ax.axhline(y=0.70, color="gray", linestyle="--", linewidth=1.5, alpha=0.85,
               label="Functional threshold (0.70)")

    stats: dict = {
        "reached_085": [], "corrections_to_085": [],
        "reached_070": [], "corrections_to_070": [],
        "max_sim": 0.0,    "max_author": "",      "max_correction": 0,
    }

    def rolling_avg(sims: list[float], window: int = 5) -> list[float]:
        out = []
        for i in range(len(sims)):
            start = max(0, i - window + 1)
            out.append(sum(sims[start:i + 1]) / (i - start + 1))
        return out

    for i, (author, cdata) in enumerate(curves.items()):
        sims    = rolling_avg(cdata["sims"])   # BUG 2 FIX: 5-correction rolling average
        persona = cdata["persona"]
        color   = colors[i % len(colors)]
        ax.plot(range(1, len(sims) + 1), sims, linewidth=2, color=color,
                label=f"{author[:8]}... ({persona})")

        for j, s in enumerate(sims):
            if s > stats["max_sim"]:
                stats["max_sim"]        = s
                stats["max_author"]     = author[:8]
                stats["max_correction"] = j + 1

        c085 = next((j + 1 for j, s in enumerate(sims) if s >= 0.85), None)
        c070 = next((j + 1 for j, s in enumerate(sims) if s >= 0.70), None)
        if c085:
            stats["reached_085"].append(author[:8])
            stats["corrections_to_085"].append(c085)
        if c070:
            stats["reached_070"].append(author[:8])
            stats["corrections_to_070"].append(c070)

    ax.set_xlabel("Correction Number", fontsize=12)
    ax.set_ylabel("Cosine Similarity to Persona Centroid", fontsize=12)
    ax.set_title("Preference Perceptron Convergence by User", fontsize=14, fontweight="bold")
    ax.set_title("Preference Perceptron Convergence by User\n"
                 "held-out test set ground truth, 5-correction rolling average",
                 fontsize=13, fontweight="bold")
    ax.set_xlim(left=1)
    ax.set_ylim(0, 1.05)
    ax.grid(True, alpha=0.3)
    ax.legend(loc="lower right", fontsize=9)
    plt.tight_layout()
    plt.savefig("convergence_curve.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved → convergence_curve.png")
    return stats


# ─────────────────────────────────────────────────────────────────────────────
# DECAY EXPERIMENT  [8/8]
# Compares no-decay vs. exp(-λ·days) on authors with ≥50 corrections.
# Reuses the same 80/20 chronological split as compute_convergence.
# ─────────────────────────────────────────────────────────────────────────────

DECAY_LAMBDA   = 0.01
DECAY_MIN_CORR = 50


def _rolling_avg(sims: list[float], window: int = 5) -> list[float]:
    out = []
    for i in range(len(sims)):
        start = max(0, i - window + 1)
        out.append(sum(sims[start:i + 1]) / (i - start + 1))
    return out


def _parse_created(s: str):
    """Parse a created timestamp string into a naive datetime, or None."""
    from datetime import datetime
    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f",   "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",      "%Y-%m-%d",
    ):
        try:
            dt = datetime.strptime(s, fmt)
            return dt.replace(tzinfo=None)  # strip tz for simple subtraction
        except ValueError:
            continue
    return None


def compute_decay_experiment(
    events: list[dict],
    personas: dict,
    ml: MLService,
    learning_rate: float = 0.1,
    min_corrections: int = DECAY_MIN_CORR,
    feature_keys: list[str] | None = None,
) -> dict:
    if feature_keys is None:
        feature_keys = BASE_FEATURE_KEYS
    from numpy.linalg import norm

    author_accepted = defaultdict(list)
    for e in events:
        if e["action"] == "accepted":
            author_accepted[e["author"]].append(e)

    qualifying = {
        a: sorted(evs, key=lambda e: e.get("created", ""))
        for a, evs in author_accepted.items()
        if len(evs) >= min_corrections
    }

    if not qualifying:
        return {"n_qualifying": 0, "min_corrections": min_corrections, "authors": {}}

    rejected_lookup = {
        (e["key"], e["created"], e["field"]): e
        for e in events if e["action"] == "rejected"
    }

    authors_data: dict = {}

    for author, evs in qualifying.items():
        if author not in personas:
            continue

        split_idx = max(1, int(len(evs) * 0.8))
        train_evs = evs[:split_idx]
        test_evs  = evs[split_idx:]
        if len(test_evs) < 2:
            continue

        # Ground-truth centroid from held-out 20% (same as compute_convergence)
        test_vecs = np.array([ev["features"] for ev in test_evs])
        centroid  = test_vecs.mean(axis=0)
        c_norm    = norm(centroid)
        if c_norm == 0:
            continue
        centroid /= c_norm

        # Parse timestamps; fall back to correction_index * 7 days if missing
        ts_list = [_parse_created(ev.get("created", "")) for ev in train_evs]
        ts0     = next((t for t in ts_list if t is not None), None)

        # Two separate repos — one per variant — so state doesn't bleed across
        repo_nd = _InMemoryRepo()
        repo_wd = _InMemoryRepo()

        sims_no_decay:   list[float] = []
        sims_with_decay: list[float] = []

        for i, ev in enumerate(train_evs):
            rej = rejected_lookup.get((ev["key"], ev["created"], ev["field"]))
            if not rej:
                continue

            phi_a = ev["features"]
            phi_r = rej["features"]
            days  = max(0, (ts_list[i] - ts0).days) if (ts0 and ts_list[i]) else i * 7

            # Variant 1 — no decay: reference_days=0 → decay_weight=1.0
            ml.perceptron_update(author, phi_a, phi_r, datetime.now(), repo_nd,
                                 reference_days=0, feature_keys=feature_keys)
            # Variant 2 — with decay: pass actual days since first correction
            ml.perceptron_update(author, phi_a, phi_r, datetime.now(), repo_wd,
                                 reference_days=days, feature_keys=feature_keys)

            def _sim(repo):
                stored = repo.get_perceptron_weights(author)
                if not stored:
                    return 0.0
                w = np.array([stored["priority"], stored["urgency"], stored["duration_fit"]])
                n = norm(w)
                return float(np.dot(w, centroid) / n) if n > 0 else 0.0

            sim_nd = round(max(0.0, min(1.0, _sim(repo_nd))), 4)
            sim_wd = round(max(0.0, min(1.0, _sim(repo_wd))), 4)
            sims_no_decay.append(sim_nd)
            sims_with_decay.append(sim_wd)

        if not sims_no_decay:
            continue

        s_nd = _rolling_avg(sims_no_decay)
        s_wd = _rolling_avg(sims_with_decay)

        authors_data[author] = {
            "persona":          personas[author]["label"],
            "n_train":          len(train_evs),
            "sims_no_decay":    s_nd,
            "sims_with_decay":  s_wd,
            "final_no_decay":   round(s_nd[-1], 4),
            "final_with_decay": round(s_wd[-1], 4),
            "mean_no_decay":    round(statistics.mean(s_nd), 4),
            "mean_with_decay":  round(statistics.mean(s_wd), 4),
            "improvement":      round(s_wd[-1] - s_nd[-1], 4),
        }

    return {"n_qualifying": len(authors_data), "min_corrections": min_corrections, "authors": authors_data}


def plot_decay_comparison(decay_data: dict) -> None:
    if not HAS_MATPLOTLIB:
        print("  WARNING: matplotlib not installed.")
        return

    authors = decay_data.get("authors", {})
    if not authors:
        print("  No qualifying authors (≥50 corrections) for decay plot.")
        return

    n_authors = len(authors)
    fig, axes = plt.subplots(1, n_authors, figsize=(8 * n_authors, 6),
                             squeeze=False, facecolor="white")

    for col, (author, adata) in enumerate(authors.items()):
        ax = axes[0][col]
        ax.set_facecolor("white")

        xs = range(1, len(adata["sims_no_decay"]) + 1)
        ax.plot(xs, adata["sims_no_decay"],  color="orange",    linewidth=2, label="No decay")
        ax.plot(xs, adata["sims_with_decay"], color="steelblue", linewidth=2, label="With decay (λ=0.01)")
        ax.axhline(y=0.85, color="red",  linestyle="--", linewidth=1.5, alpha=0.8, label="0.85 threshold")
        ax.axhline(y=0.70, color="gray", linestyle="--", linewidth=1.5, alpha=0.8, label="0.70 threshold")

        ax.set_xlabel("Correction Number", fontsize=11)
        ax.set_ylabel("Cosine Similarity to Persona Centroid", fontsize=11)
        ax.set_title(f"{author[:8]}... ({adata['persona']})", fontsize=11)
        ax.set_xlim(left=1)
        ax.set_ylim(0, 1.05)
        ax.grid(True, alpha=0.3)
        ax.legend(loc="lower right", fontsize=9)

    fig.suptitle(
        "Effect of Time Decay on Preference Convergence\n"
        "λ=0.01, 5-correction rolling average, held-out ground truth",
        fontsize=13, fontweight="bold",
    )
    plt.tight_layout()
    plt.savefig("decay_comparison.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved → decay_comparison.png")


# ─────────────────────────────────────────────────────────────────────────────
# REPORT  (reordered per spec: 1-Dataset 2-Pipeline 3-OpenAI 4-Model
#          5-Weights 6-Baselines 7-Simulation 8-Personas 9-Top 10-Convergence)
# ─────────────────────────────────────────────────────────────────────────────

def section(title: str):
    print(f"\n{'═' * 64}\n  {title}\n{'═' * 64}")


def print_report(
    metrics, learned, sim, persona_metrics, persona_counts,
    field_breakdown, reasonings, use_openai, validator,
    baselines, convergence_stats, decay_data=None,
    discovery=None, feature_keys=None,
):
    # 1. DATASET SUMMARY
    section("DATASET SUMMARY")
    print(f"  Total corrections processed:   {metrics['n_samples'] // 2:>10,}")
    print(f"  Events (accepted + rejected):  {metrics['n_samples']:>10,}")
    print()
    print("  Events by field type:")
    for field, count in sorted(field_breakdown.items(), key=lambda x: -x[1]):
        print(f"    {field:<28} {count:>8,}")

    # 2. PIPELINE SUMMARY
    section("PIPELINE SUMMARY")
    mode = ("OpenAI interpretation → ML validator → Perceptron" if use_openai
            else "Rule-based features → ML validator → Perceptron")
    print(f"  Feature extraction:  {mode}")
    print(f"  Events processed:    {metrics['n_samples']:,}")
    print(f"  Validator passed:    {validator.accepted_count:,}")
    print(f"  Validator rejected:  {validator.rejected_count:,}")
    total_v = validator.accepted_count + validator.rejected_count
    rate    = validator.rejected_count / total_v if total_v else 0
    print(f"  Validator rejection rate:              {rate:.1%}")
    r = validator.rejection_reasons
    print(f"  Rejected - insufficient history:   {r.get('insufficient_history',   0):>6,}")
    print(f"  Rejected - inconsistent direction: {r.get('inconsistent_direction', 0):>6,}")
    print(f"  Rejected - low confidence:         {r.get('low_confidence',         0):>6,}")
    print(f"  Rejected - feature invalid:        {r.get('feature_invalid',        0):>6,}")
    print(f"  Rejected - no change:              {r.get('no_change',              0):>6,}")

    # 3. SAMPLE OpenAI INTERPRETATIONS
    if reasonings and use_openai:
        section("SAMPLE OpenAI INTERPRETATIONS")
        for r in reasonings[:5]:
            print(f"  • {r}")

    # 4. MODEL PERFORMANCE
    section("MODEL PERFORMANCE  (LogisticRegression, 3 features)")
    print(f"  Accuracy:      {metrics['accuracy']:.4f}")
    print(f"  Precision:     {metrics['precision']:.4f}")
    print(f"  Recall:        {metrics['recall']:.4f}")
    print(f"  F1 Score:      {metrics['f1']:.4f}")
    print(f"  ROC-AUC:       {metrics['roc_auc']:.4f}")
    print(f"  5-Fold CV AUC: {metrics['cv_roc_auc_mean']:.4f} ± {metrics['cv_roc_auc_std']:.4f}")
    print()
    print(metrics["classification_report"])
    cm = metrics["confusion_matrix"]
    print("  Confusion Matrix:")
    print(f"                    Pred Rejected   Pred Accepted")
    print(f"  True Rejected:    {cm[0][0]:>13,}   {cm[0][1]:>13,}")
    print(f"  True Accepted:    {cm[1][0]:>13,}   {cm[1][1]:>13,}")

    # 5a. DYNAMIC FEATURE DISCOVERY
    if discovery is not None:
        section("DYNAMIC FEATURE DISCOVERY")
        counts = discovery.key_counts
        promoted = discovery.promoted_keys
        fkeys = feature_keys or BASE_FEATURE_KEYS
        print(f"  Feature vector dimensionality: {len(fkeys)}D  "
              f"({'base 3' if not promoted else f'base 3 + {len(promoted)} latent'})")
        print()
        print(f"  {'Latent key':<28} {'Seen':>8}  {'Promoted':>10}")
        print(f"  {'─' * 52}")
        for k, c in sorted(counts.items(), key=lambda x: -x[1]):
            status = "✓  YES" if k in promoted else "─  no"
            print(f"  {k:<28} {c:>8,}  {status:>10}")
        if not counts:
            print("  (no latent vars returned — run with OpenAI enabled)")

    # 5b. LEARNED WEIGHTS vs DEFAULT
    section("LEARNED WEIGHTS  vs  DEFAULT WEIGHTS")
    fkeys = feature_keys or BASE_FEATURE_KEYS
    print(f"  {'Feature':<24} {'Default':>10}  {'Learned':>10}  {'Δ':>9}")
    print(f"  {'─' * 58}")
    for k in fkeys:
        default_val = DEFAULT_WEIGHTS.get(k, 0.0)
        delta = learned.get(k, 0.0) - default_val
        print(f"  {k:<24} {default_val:>10.4f}  {learned.get(k, 0.0):>10.4f}  {delta:>+9.4f}")

    # 6. BASELINE COMPARISON
    section("BASELINE COMPARISON")
    if baselines:
        print(f"  {'Method':<36} {'Accuracy':>10}    {'vs Default':>12}")
        print(f"  {'─' * 62}")
        rows = [
            ("A_full_pipeline",   "A) Full pipeline (ours)"),
            ("B_rule_based",      "B) Rule-based only"),
            ("C_perceptron_only", "C) Perceptron only"),
            ("D_openai_gate",     "D) OpenAI gate only"),
        ]
        for key, label in rows:
            b  = baselines[key]
            vs = (f"{b['vs_default']:>+.2%}" if b["vs_default"] != 0
                  else "  0.00%  (baseline)")
            print(f"  {label:<36} {b['accuracy']:>10.4f}    {vs}")
        print()
        print(f"  Best baseline method:               {baselines['best_method']}")
        imp = baselines["our_improvement_over_best_baseline"]
        print(f"  Our improvement over best baseline: {imp:>+.2%}")

    # 7. SCHEDULING SIMULATION
    section("SCHEDULING SIMULATION")
    if sim:
        print(f"  Pairs evaluated:             {sim['n_pairs']:>10,}")
        print(f"  Default scheduler accuracy:  {sim['default_accuracy']:>10.4f}")
        print(f"  Learned scheduler accuracy:  {sim['learned_accuracy']:>10.4f}")
        print(f"  Accuracy improvement:        {sim['accuracy_improvement']:>+10.4f}")
        print(f"  % pairs improved by learning:{sim['pct_pairs_improved']:>10.2%}")
        print(f"  Mean score-gap Δ:            {sim['avg_score_delta']:>+10.6f}")

    # 8. USER PERSONA DISTRIBUTION
    section("USER PERSONA DISTRIBUTION")
    max_count = max(persona_counts.values()) if persona_counts else 1
    for label, count in sorted(persona_counts.items(), key=lambda x: -x[1]):
        bar = "█" * max(int(count / max_count * 30), 1)
        print(f"  {label:<24} {count:>6,}  {bar}")

    # 9. TOP PERSONAS
    section("TOP PERSONAS  (by correction volume)")
    print(f"  {'Author':<14} {'Persona':<24} {'Field':<14} {'N':>6}  {'Acc':>6}   P /  U /  D")
    print(f"  {'─' * 80}")
    for p in persona_metrics[:15]:
        w = p["learned_weights"]
        print(f"  {p['author']:<14} {p['persona']:<24} {p['dominant_field']:<14} "
              f"{p['n_corrections']:>6}  {p['accuracy']:>6.4f}  "
              f"{w['priority']:.2f}/{w['urgency']:.2f}/{w['duration_fit']:.2f}")

    # 10. CONVERGENCE ANALYSIS SUMMARY
    section("CONVERGENCE ANALYSIS SUMMARY")
    n_q   = convergence_stats.get("n_qualifying", 0)
    thresh = convergence_stats.get("threshold_used", 8)
    print(f"  Authors qualifying (≥{thresh} corrections):  {n_q}")
    r085  = convergence_stats.get("reached_085", [])
    c085  = convergence_stats.get("corrections_to_085", [])
    c070  = convergence_stats.get("corrections_to_070", [])
    print(f"  Authors reaching 0.85 threshold:   {len(r085)} of {n_q}")
    if c085:
        print(f"  Mean corrections to reach 0.85:    {statistics.mean(c085):.1f}")
    if c070:
        print(f"  Mean corrections to reach 0.70:    {statistics.mean(c070):.1f}")
    ms = convergence_stats.get("max_sim", 0)
    ma = convergence_stats.get("max_author", "?")
    mc = convergence_stats.get("max_correction", 0)
    print(f"  Highest cosine similarity:         {ms:.4f}  "
          f"(author: {ma}, at correction {mc})")
    if HAS_MATPLOTLIB and convergence_stats.get("curves"):
        print("  convergence_curve.png generated ✓")

    # 11. DECAY EXPERIMENT
    if decay_data:
        section("DECAY EXPERIMENT  (λ=0.01, authors with ≥50 corrections)")
        n_q = decay_data.get("n_qualifying", 0)
        min_c = decay_data.get("min_corrections", DECAY_MIN_CORR)
        print(f"  Authors qualifying (≥{min_c} corrections): {n_q}")
        authors = decay_data.get("authors", {})
        if authors:
            print()
            print(f"  {'Author':<14} {'Persona':<24}  {'Final(no decay)':>16}  {'Final(decay)':>13}  {'Mean(no decay)':>15}  {'Mean(decay)':>12}  {'Δ Final':>8}")
            print(f"  {'─' * 100}")
            improvements = []
            for author, adata in authors.items():
                imp = adata["improvement"]
                improvements.append(imp)
                print(f"  {author[:8]+'...':<14} {adata['persona']:<24}  "
                      f"{adata['final_no_decay']:>16.4f}  "
                      f"{adata['final_with_decay']:>13.4f}  "
                      f"{adata['mean_no_decay']:>15.4f}  "
                      f"{adata['mean_with_decay']:>12.4f}  "
                      f"{imp:>+8.4f}")
            if improvements:
                print()
                print(f"  Mean Δ final cosine similarity (decay − no decay): {statistics.mean(improvements):>+.4f}")
            if HAS_MATPLOTLIB:
                print("  decay_comparison.png generated ✓")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def _compute_global_perceptron_weights(events: list[dict], ml: MLService,
                                       feature_keys: list[str] | None = None) -> dict | None:
    """
    Replay MLService.perceptron_update() over all correction pairs chronologically
    — identical logic to backend's recompute_weights_from_history().
    """
    pairs_by_key = defaultdict(lambda: {"rejected": None, "accepted": None})
    for e in events:
        pairs_by_key[(e["key"], e["created"], e["field"])][e["action"]] = e

    correction_pairs = [
        (v["rejected"], v["accepted"])
        for v in pairs_by_key.values()
        if v["rejected"] and v["accepted"]
    ]
    if not correction_pairs:
        return None

    correction_pairs.sort(key=lambda p: p[1].get("created", ""))

    repo = _InMemoryRepo()
    ts0  = None

    for rej, acc in correction_pairs:
        ts_str = acc.get("created", "")
        ts     = _parse_created(ts_str) if ts_str else None
        if ts0 is None and ts is not None:
            ts0 = ts
        days = max(0, (ts - ts0).days) if (ts and ts0) else 0

        ml.perceptron_update(
            "_global", acc["features"], rej["features"],
            datetime.now(), repo,
            reference_days=days,
            feature_keys=feature_keys or BASE_FEATURE_KEYS,
        )

    return repo.get_perceptron_weights("_global")


async def run(args):
    csv_path   = Path(args.csv)
    use_openai = not args.no_openai

    print("ClockIn Scheduling Pipeline Simulation")
    print(f"{'─' * 40}")
    print(f"Dataset:     {csv_path}")
    print(f"Sample size: {args.sample or 'all'}")
    print(f"OpenAI:      {'enabled' if use_openai else 'disabled (rule-based fallback)'}")

    # Issue 4: prominent warning for --no-openai
    if not use_openai:
        print()
        print("  WARNING: Running without OpenAI. Results are NOT comparable to")
        print("  OpenAI runs and should not be cited in the paper without this disclaimer.")

    if not csv_path.exists():
        print(f"\nERROR: {csv_path} not found.")
        sys.exit(1)

    interpreter = None
    if use_openai:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("\nERROR: OPENAI_API_KEY not set.")
            print("Set it in backend/.env or run with --no-openai for rule-based fallback.")
            sys.exit(1)
        interpreter = InterpretationService(api_key, max_concurrent=MAX_CONCURRENT_OPENAI,
                                            max_retries=OPENAI_MAX_RETRIES)

    validator = FeatureValidator()  # backend class — stateful per author
    ml        = MLService()

    print("\n[1/7] Loading + interpreting events...")
    events, reasonings, raw_pairs = await load_events(
        csv_path, args.sample, interpreter, validator, use_openai,
        clean=args.clean,
    )
    print(f"      {len(events):,} validated events ({len(events) // 2:,} pairs)")
    print(f"      {len(raw_pairs):,} raw pairs (for Baseline C)")

    if len(events) < 20:
        print("ERROR: Not enough usable events after validation.")
        print("Try a larger --sample or check CSV column names.")
        sys.exit(1)

    # ── Dynamic feature discovery ────────────────────────────────────────────
    discovery = _SimFeatureDiscovery()
    for ev in events:
        if ev["action"] == "accepted":
            discovery.record(ev.get("latent_vars", {}))

    n_pairs           = len(events) // 2
    promo_threshold   = max(SIM_PROMOTION_THRESHOLD, n_pairs // 10)
    promoted_keys     = discovery.compute_promoted(promo_threshold)
    feature_keys      = BASE_FEATURE_KEYS + promoted_keys

    print(f"      Latent keys seen: {discovery.key_counts}")
    print(f"      Promoted (≥{promo_threshold} appearances): {promoted_keys or 'none'}")

    if promoted_keys:
        events = _expand_event_features(events, promoted_keys)
        print(f"      Feature vector expanded: 3D → {len(feature_keys)}D")
    # ────────────────────────────────────────────────────────────────────────

    field_breakdown = defaultdict(int)
    for e in events:
        if e["action"] == "accepted":
            field_breakdown[e["field"]] += 1

    print("[2/7] Training perceptron...")
    model, X, y = train_perceptron(events)
    learned      = get_learned_weights(model, feature_keys)

    print("[3/7] Computing metrics...")
    metrics = compute_metrics(model, X, y)

    print("[4/7] Building user personas...")
    personas        = build_personas(events)
    persona_counts  = defaultdict(int)
    for p in personas.values():
        persona_counts[p["label"]] += 1
    persona_metrics = compute_persona_metrics(personas)

    print("[5/7] Running scheduling simulation + baselines...")
    pairs = build_pairs(events)

    # Primary weights for simulation: online perceptron via MLService (mirrors backend).
    # Fall back to LR weights if perceptron produces no correction pairs.
    perceptron_weights = _compute_global_perceptron_weights(events, ml, feature_keys)
    sim_weights = perceptron_weights if perceptron_weights else learned

    sim       = simulate_scheduling(events, sim_weights, feature_keys)
    baselines = compute_baselines(pairs, events, sim_weights, raw_pairs, feature_keys)

    print("[6/7] Computing convergence curves...")
    conv_data  = compute_convergence(events, personas, ml,
                                     learning_rate=args.learning_rate,
                                     feature_keys=feature_keys)
    plot_stats = plot_convergence(conv_data)
    conv_stats = {
        "n_qualifying":     conv_data.get("n_qualifying", 0),
        "threshold_used":   conv_data.get("threshold_used", 8),
        "threshold_warned": conv_data.get("threshold_warned", False),
        "curves":           conv_data.get("curves", {}),
        **plot_stats,
    }

    print("[7/7] Generating report...")

    print("[8/8] Running decay experiment...")
    decay_data = compute_decay_experiment(events, personas, ml,
                                          learning_rate=args.learning_rate,
                                          feature_keys=feature_keys)
    plot_decay_comparison(decay_data)

    print_report(
        metrics, learned, sim, persona_metrics, dict(persona_counts),
        dict(field_breakdown), reasonings, use_openai, validator,
        baselines, conv_stats, decay_data,
        discovery=discovery, feature_keys=feature_keys,
    )

    output = {
        "pipeline":            "openai→validator→perceptron" if use_openai else "rules→validator→perceptron",
        "metrics":             {k: v for k, v in metrics.items() if k != "classification_report"},
        "learned_weights":     learned,
        "default_weights":     DEFAULT_WEIGHTS,
        "simulation":          sim,
        "baseline_comparison": baselines,
        "field_breakdown":     dict(field_breakdown),
        "validator": {
            "passed":   validator.accepted_count,
            "rejected": validator.rejected_count,
            "reasons":  validator.rejection_reasons,
        },
        "convergence": {
            "n_qualifying":   conv_data.get("n_qualifying", 0),
            "threshold_used": conv_data.get("threshold_used", 8),
            "stats":          {k: v for k, v in plot_stats.items() if k != "curves"},
        },
        "persona_summary":     persona_metrics[:20],
        "sample_reasonings":   reasonings[:10],
        "feature_discovery": {
            "feature_keys":   feature_keys,
            "promoted_keys":  promoted_keys,
            "key_counts":     discovery.key_counts,
        },
        "decay_comparison": {
            "n_qualifying":    decay_data.get("n_qualifying", 0),
            "min_corrections": decay_data.get("min_corrections", DECAY_MIN_CORR),
            "authors": {
                author: {k: v for k, v in adata.items() if k not in ("sims_no_decay", "sims_with_decay")}
                for author, adata in decay_data.get("authors", {}).items()
            },
        },
    }
    out_path = Path(args.out)
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved → {out_path}")


def main():
    parser = argparse.ArgumentParser(description="ClockIn pipeline simulation")
    parser.add_argument("--csv",       default="changelog_filtered.csv")
    parser.add_argument("--sample",    type=int, default=None)
    parser.add_argument("--out",       default="simulation_results.json")
    parser.add_argument("--no-openai", action="store_true",
                        help="Rule-based fallback. Results NOT paper-comparable to OpenAI runs.")
    parser.add_argument("--clean", action="store_true",
                        help="Only process priority/duedate fields. Removes timespent/status noise.")
    parser.add_argument("--learning-rate", type=float, default=0.1,
                        help="Perceptron online update learning rate (default: 0.1)")
    args = parser.parse_args()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
