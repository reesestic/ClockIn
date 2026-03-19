import { supabase } from "../database/supabaseClient";
import type Task from "../interfaces/task";

const API_URL = "http://127.0.0.1:8000";

async function authHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token ?? ""}`,
    };
}

export async function getTasksForUser(): Promise<Task[]> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/calendar/tasks/user/me`, { headers });
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
}

export async function deleteTask(taskId: string): Promise<void> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/calendar/tasks/${taskId}`, {
        method: "DELETE",
        headers,
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
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/calendar/tasks`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create task");
    return res.json();
}
