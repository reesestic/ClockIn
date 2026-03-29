import { API_ROUTES } from "../constants/apiRoutes.ts";
import type { Task } from "../types/Task.ts";
import { authFetch } from "./authFetch.ts";



export async function getTasks(): Promise<Task[]> {
    const response = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.TASKS}`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch tasks");
    }

    return await response.json();
}


export async function saveTask(activeTask: Omit<Task, "id" | "can_schedule">) {
    if (!activeTask) return;

    const response = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.TASKS}/save`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                title: activeTask.title,
                description: activeTask.description,
                importance: activeTask.importance,
                difficulty: activeTask.difficulty,
                task_duration: activeTask.task_duration,
                due_date: activeTask.due_date,
                status: "to do",
            })
        }
    );

    if (!response.ok) {
        throw new Error("Failed to create task");
    }

    return await response.json();
}

export async function deleteTask (taskID : string) {
    const response = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.TASKS}/delete/${taskID}`,
        {
            method: "DELETE",
        }
    );
    if (!response.ok) {
        throw new Error("Failed to delete task");
    }
    return taskID;
}


export async function updateTask(task: Task): Promise<Task> {
    const response = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.TASKS}/update/${task.id}`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: task.title,
                description: task.description,
                importance: task.importance,
                difficulty: task.difficulty,
                due_date: task.due_date,
                task_duration: task.task_duration,
                status: task.status,
                can_schedule: task.can_schedule,
            })
        }
    );
    if (!response.ok) throw new Error("Failed to update task");
    return await response.json();
}
