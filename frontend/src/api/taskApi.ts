import type Task from "../interfaces/task";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

function authHeaders(): HeadersInit {
    const token = localStorage.getItem("clockin_token") ?? "";
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
    };
}

export async function getTasksForUser(): Promise<Task[]> {
    const res = await fetch(`${API_URL}/tasks/user/me`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
}

export async function deleteTask(taskId: string): Promise<void> {
    const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete task");
}

export async function createTask(payload: {
    title: string;
    description?: string;
    due_date?: string;
    task_duration?: number;
    priority?: number;
}): Promise<Task> {
    const res = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create task");
    return res.json();
}
