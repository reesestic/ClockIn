import type Task from "../interfaces/task";

const BASE = import.meta.env.VITE_API_URL;

export async function getTasksForUser(userId: string): Promise<Task[]> {
    const res = await fetch(`${BASE}/calendar/tasks/user/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
}

export async function scheduleTask(
    taskId: string,
    oauthToken: string,
    refreshToken: string,
    userId: string
): Promise<{ task_id: string; calendar_event_id: string; scheduled_start: string }> {
    const res = await fetch(`${BASE}/calendar/schedule/${taskId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            oauth_token: oauthToken,
            refresh_token: refreshToken,
            user_id: userId,
        }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Failed to schedule task");
    }
    return res.json();
}

export async function markTaskComplete(taskId: string): Promise<Task> {
    const res = await fetch(`${BASE}/calendar/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_complete: true }),
    });
    if (!res.ok) throw new Error("Failed to update task");
    return res.json();
}
