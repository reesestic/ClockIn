import type Task from "../interfaces/task";

const API_URL = "http://127.0.0.1:8000";

export async function getTasksForUser(userId: string): Promise<Task[]> {
    const res = await fetch(`${API_URL}/calendar/tasks/user/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
}

export async function deleteTask(taskId: string): Promise<void> {
    const res = await fetch(`${API_URL}/calendar/tasks/${taskId}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete task");
}

export async function createTask(payload: {
    user_id: string;
    title: string;
    description?: string;
    due_date?: string;
    task_duration?: number;
    priority?: number;
}): Promise<Task> {
    const res = await fetch(`${API_URL}/calendar/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create task");
    return res.json();
}
