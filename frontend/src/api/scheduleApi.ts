import { API_ROUTES } from "../constants/apiRoutes";
import type { ScheduleFilters } from "../types/ScheduleFilters";
import type { Schedule } from "../types/Schedule";
import { authFetch } from "./authFetch";


export async function getActiveSchedule() {
    const res = await authFetch(`${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}`);
    if (!res.ok) throw new Error("Failed to fetch schedule");
    return res.json();
}

export async function generateSchedule(taskIds: string[], filters: ScheduleFilters) : Promise<Schedule> {
    console.log("Hit scheduleApi.ts generateSchedule()")
    console.log("TaskIds: " + taskIds);

    const res = await authFetch(`${import.meta.env.VITE_API_URL}${API_ROUTES.SCHEDULE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds, filters }),
    });

    if (!res.ok) {
        const text = await res.text();   // 👈 ADD THIS
        console.error("❌ BACKEND ERROR:", text);
        throw new Error("Failed to generate schedule");
    }

    return res.json();
}