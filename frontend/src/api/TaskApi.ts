import { API_ROUTES } from "../constants/apiRoutes";
import type { Task } from "../types/Task";
import { authFetch } from "./authFetch";

export async function getTasks(): Promise<Task[]> {
    const res = await authFetch(`${import.meta.env.VITE_API_URL}${API_ROUTES.TASKS}`);
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
}

export async function createTask(task: Task) {
    const res = await authFetch(`${import.meta.env.VITE_API_URL}${API_ROUTES.TASKS}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
    });

    if (!res.ok) throw new Error("Failed to create task");
    return res.json();
}

export async function deleteTask(taskId: string) {
    const res = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.TASKS}/${taskId}`,
        { method: "DELETE" }
    );

    if (!res.ok) throw new Error("Failed to delete task");
    return res.json();
}