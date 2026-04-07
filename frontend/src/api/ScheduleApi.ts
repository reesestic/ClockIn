import type { ScheduleFilters } from "../types/ScheduleFilters";
import type { Schedule } from "../types/Schedule";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

function authHeaders(): HeadersInit {
    const token = localStorage.getItem("clockin_token") ?? "";
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
    };
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function parseLocalTime(iso: string): string {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseLocalDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function generateSchedule(taskIds: string[], filters: ScheduleFilters, userId: string): Promise<Schedule> {
    const res = await fetch(`${API_URL}/schedule/generate?user_id=${userId}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ task_ids: taskIds, filters }),
    });
    if (!res.ok) throw new Error("Failed to generate schedule");
    const data = await res.json();
    return {
        id: Date.now().toString(),
        name: "Generated Schedule",
        blocks: data.map((b: any, i: number) => ({
            id: `block-${i}`,
            taskId: b.task_id,
            title: b.title,
            start: parseLocalTime(b.start),
            end: parseLocalTime(b.end),
            date: parseLocalDate(b.start),
        })),
    };
}

export async function acceptBlock(taskId: string, scheduledStart: string, scheduledEnd: string, userId: string): Promise<void> {
    await fetch(`${API_URL}/schedule/accept?user_id=${userId}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ task_id: taskId, scheduled_start: scheduledStart, scheduled_end: scheduledEnd }),
    });
}

export async function rejectBlock(taskId: string, slotOffered: string, userId: string): Promise<void> {
    await fetch(`${API_URL}/schedule/reject?user_id=${userId}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ task_id: taskId, slot_offered: slotOffered, action: "rescheduled" }),
    });
}

export async function getSchedule(userId?: string) {
    const url = userId
        ? `${API_URL}/schedule/user/${userId}`
        : `${API_URL}/schedule`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch schedule");
    return res.json();
}
