import { ROUTES } from "../constants/Routes.ts";
import type { Task } from "../types/Task";

export async function getTasks(): Promise<Task[]> {
    const response = await fetch(
        `${import.meta.env.VITE_API_URL}${ROUTES.TASKS}`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch tasks");
    }

    return await response.json();
}
