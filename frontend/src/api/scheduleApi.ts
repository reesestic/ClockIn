import { API_ROUTES } from "../constants/apiRoutes";
import type { ScheduleFilters } from "../types/ScheduleFilters";
import type { Schedule } from "../types/Schedule";
import type { ScheduleBlock } from "../types/ScheduleBlock";
import { authFetch } from "./authFetch";

/** Convert a backend block (ISO datetime start/end) to a frontend ScheduleBlock */
function parseBlock(raw: any): ScheduleBlock {
    const start = new Date(raw.start);
    const end = new Date(raw.end);
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    return {
        id: raw.task_id ?? raw.id ?? crypto.randomUUID(),
        title: raw.title ?? "",
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

export async function getSchedule(): Promise<Schedule> {
    const res = await authFetch(`${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}`);
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
    const res = await authFetch(`${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_ids: taskIds, filters, user_id: userId }),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("❌ BACKEND ERROR:", text);
        throw new Error("Failed to generate schedule");
    }

    const data = await res.json();
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
    await authFetch(`${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, start_time: startTime, end_time: endTime, user_id: userId }),
    });
}

export async function rejectBlock(
    taskId: string,
    originalTime: string,
    userId: string
): Promise<void> {
    await authFetch(`${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, original_time: originalTime, user_id: userId }),
    });
}
