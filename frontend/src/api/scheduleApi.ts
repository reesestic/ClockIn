import { API_ROUTES } from "../constants/apiRoutes";
import type { ScheduleFilters } from "../types/ScheduleFilters";
import type { Schedule } from "../types/Schedule";
import type { ScheduleBlock } from "../types/ScheduleBlock";
import { authFetch } from "./authFetch";

/** Convert a backend block (ISO datetime start/end) to a frontend ScheduleBlock */
/** Strip timezone suffix so the browser treats the value as local wall-clock time.
 *  The backend stores naive local datetimes; Supabase re-adds +00:00 on read,
 *  which would shift the displayed time by the user's UTC offset. */
function stripTZ(s: string): string {
    return s.replace(/([+-]\d{2}:\d{2}|Z)$/, "");
}

function parseBlock(raw: any): ScheduleBlock {
    // Backend returns either "start"/"end" (generate) or "scheduled_start"/"scheduled_end" (load)
    const start = new Date(stripTZ(raw.start ?? raw.scheduled_start ?? ""));
    const end   = new Date(stripTZ(raw.end   ?? raw.scheduled_end   ?? ""));
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    return {
        // Prefer the schedule-row UUID (raw.id) so blocks are always unique,
        // even if the same task appears twice due to old duplicate DB rows.
        // Fall back to task_id for freshly-generated blocks (not yet in DB).
        id: raw.id ?? raw.task_id ?? crypto.randomUUID(),
        title: raw.title ?? "",
        description: raw.description ?? undefined,
        date,
        start: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        end: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
        task_id: raw.task_id,
        color: raw.color,
    };
}

function wrapBlocks(rawBlocks: any[]): Schedule {
    const blocks = rawBlocks.map(parseBlock);
    return {
        id: crypto.randomUUID(),
        name: "Generated Schedule",
        date: blocks[0]?.date ?? new Date().toISOString().slice(0, 10),
        blocks,
    };
}

export async function getSchedule(userId?: string): Promise<Schedule> {
    const url = userId
        ? `${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}/user/${userId}`
        : `${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error("Failed to fetch schedule");
    const data = await res.json();
    if (Array.isArray(data)) return wrapBlocks(data);
    if (data?.blocks) return { ...data, blocks: data.blocks.map(parseBlock) };
    return data;
}

export async function generateSchedule(
    taskIds: string[],
    filters: ScheduleFilters,
    userId?: string
): Promise<Schedule> {
    const url = userId
        ? `${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}/generate?user_id=${userId}`
        : `${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}/generate`;
    const res = await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
                task_ids: taskIds,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                filters: (({ allowed_days: _days, ...rest }) => rest)(filters),
                allowed_days: filters.allowed_days ?? [],
            }),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("❌ BACKEND ERROR:", text);
        throw new Error("Failed to generate schedule");
    }

    const data = await res.json();
    // New shape: { scheduled: [...], skipped: [...] }
    if (data?.scheduled) {
        const schedule = wrapBlocks(data.scheduled);
        schedule.skipped = (data.skipped ?? []).map((s: any) => s.title);
        return schedule;
    }
    if (Array.isArray(data)) return wrapBlocks(data);
    if (data?.blocks) return { ...data, blocks: data.blocks.map(parseBlock) };
    return data;
}

export async function acceptBlock(
    taskId: string,
    startTime: string,
    endTime: string,
    userId: string
): Promise<void> {
    await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}/accept?user_id=${userId}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task_id: taskId, scheduled_start: startTime, scheduled_end: endTime }),
        }
    );
}

export async function confirmSchedule(blocks: ScheduleBlock[], userId: string): Promise<void> {
    const payload = blocks
        .filter((b) => b.task_id)
        .map((b) => ({
            task_id: b.task_id,
            scheduled_start: `${b.date}T${b.start}:00`,
            scheduled_end: `${b.date}T${b.end}:00`,
        }));
    await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}/confirm?user_id=${userId}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }
    );
}

export async function rejectBlock(
    taskId: string,
    originalTime: string,
    userId: string
): Promise<void> {
    await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}/reject?user_id=${userId}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task_id: taskId, slot_offered: originalTime, action: "rescheduled" }),
        }
    );
}
