import styled, { keyframes } from "styled-components";
import { useState, useEffect, useRef } from "react";
import type { TimeValue, BusyTimeData } from "../../types/BusyTime";

// Re-export the type so existing importers of BusyTimeData from this file don't break
export type { BusyTimeData } from "../../types/BusyTime";

/* ── Helpers ─────────────────────── */

const HOURS   = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const MINUTES = ["00", "15", "30", "45"];
const DAYS    = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function toMinutes(t: TimeValue): number {
    let h = parseInt(t.hour);
    if (t.ampm === "PM" && h !== 12) h += 12;
    if (t.ampm === "AM" && h === 12) h = 0;
    return h * 60 + parseInt(t.minute);
}

function isEndBeforeStart(start: TimeValue, end: TimeValue): boolean {
    return toMinutes(end) <= toMinutes(start);
}

function findOverlaps(
    current: BusyTimeData,
    existing: BusyTimeData[],
    editingTitle?: string
): string[] {
    const errors: string[] = [];
    for (const other of existing) {
        if (other.title === editingTitle) continue;
        const overlappingDays = current.days.filter(d => other.days.includes(d));
        if (overlappingDays.length === 0) continue;
        const overlaps =
            toMinutes(current.start) < toMinutes(other.end) &&
            toMinutes(current.end)   > toMinutes(other.start);
        if (overlaps) errors.push(`"${other.title}" on ${overlappingDays.join(", ")}`);
    }
    return errors;
}

// ... rest of styles and component unchanged
