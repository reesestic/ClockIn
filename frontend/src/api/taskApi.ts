import type { Task } from "../types/Task";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

function authHeaders(): HeadersInit {
    const token = localStorage.getItem("clockin_token") ?? "";
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
    };
}

function mapTask(t: any): Task {
    return {
        id: t.id,
        title: t.title,
        description: t.description ?? "",
        task_duration: t.task_duration ?? 0,
        importance: t.priority ?? 0,
        difficulty: 0,
        due_date: t.due_date ?? "",
        can_schedule: t.can_schedule ?? false,
        status: t.is_complete ? "completed" : "to do",
    };
}

export async function getTasks(): Promise<Task[]> {
    const res = await fetch(`${API_URL}/calendar/tasks/user/me`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch tasks");
    const data = await res.json();
    return data.map(mapTask);
}

export async function createTask(task: Omit<Task, "id" | "can_schedule">): Promise<Task> {
    const res = await fetch(`${API_URL}/calendar/tasks`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
            title: task.title,
            description: task.description,
            due_date: task.due_date || undefined,
            task_duration: task.task_duration || undefined,
            priority: task.importance || undefined,
        }),
    });
    if (!res.ok) throw new Error("Failed to create task");
    return mapTask(await res.json());
}

export async function deleteTask(taskId: string): Promise<void> {
    const res = await fetch(`${API_URL}/calendar/tasks/${taskId}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete task");
}

export async function updateTask(taskId: string, task: Partial<Omit<Task, "id" | "can_schedule">>): Promise<Task> {
    const body: Record<string, unknown> = {};
    if (task.title       !== undefined) body.title         = task.title;
    if (task.description !== undefined) body.description   = task.description;
    if (task.due_date    !== undefined) body.due_date      = task.due_date || null;
    if (task.task_duration !== undefined) body.task_duration = task.task_duration || null;
    if (task.status      !== undefined) body.is_complete   = task.status === "completed";

    const res = await fetch(`${API_URL}/calendar/tasks/${taskId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to update task");
    return mapTask(await res.json());
}

export async function getTasksForUser(): Promise<any[]> {
    const res = await fetch(`${API_URL}/calendar/tasks/user/me`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
}
