import { API_ROUTES } from "../constants/apiRoutes";
import { authFetch } from "./authFetch";

export interface BusyTimeRecord {
    id: string;
    user_id: string;
    created_at: string;
    title: string;
    start_time: string | null;
    end_time: string | null;
    days_of_week: string[];
    source?: string;
}

export async function getBusyTimes(): Promise<BusyTimeRecord[]> {
    const res = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.BUSY_TIMES}`
    );
    if (!res.ok) throw new Error("Failed to fetch busy times");
    return res.json();
}
