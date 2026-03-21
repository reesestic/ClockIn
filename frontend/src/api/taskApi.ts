import { API_ROUTES } from "../constants/apiRoutes.ts";
import type { Task } from "../types/Task";



export async function getTasks(): Promise<Task[]> {
    const response = await fetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.TASKS}`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch tasks");
    }

    return await response.json();
}


export async function saveTask (activeTask : Task) {
    if (!activeTask) return;

    const response = await fetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.TASKS}/save`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                id: activeTask.id,
                title: activeTask.title,
                description: activeTask.description,
                importance: activeTask.importance,
                difficulty: activeTask.difficulty,
                due_date: activeTask.due_date,
                status: "to do"
            })
        }
    );

    if (!response.ok) {
        throw new Error("Failed to create task");
    }

    return await response.json();
}

export async function deleteTask (taskID : string) {
    const response = await fetch(
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