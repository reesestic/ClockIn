import { API_ROUTES } from "../constants/apiRoutes";
import { authFetch } from "./authFetch";

export function startGoogleLogin(userId: string) {
    const url = `${import.meta.env.VITE_API_URL}${API_ROUTES.GOOGLE}/login?user_id=${userId}`;
    window.location.href = url;
}

export async function syncGoogleCalendar() {
    const res = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.GOOGLE}/sync`,
        { method: "POST" }
    );
    if (!res.ok) throw new Error("Failed to sync Google Calendar");
    return res.json();
}

export async function disconnectGoogleCalendar() {
    const res = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.GOOGLE}/disconnect`,
        { method: "POST" }
    );
    if (!res.ok) throw new Error("Failed to disconnect Google Calendar");
    return res.json();
}

export async function getGoogleStatus() {
    const res = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.GOOGLE}/status`
    );
    if (!res.ok) throw new Error("Failed to fetch Google status");
    return res.json();
}
