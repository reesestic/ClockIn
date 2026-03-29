export type Task = {
    id?: string,
    title: string,
    description: string,
    task_duration: number,
    importance: number,
    difficulty: number,
    due_date: string | null,
    can_schedule: boolean,
    status: "to do" | "scheduled" | "in progress" | "completed"
}