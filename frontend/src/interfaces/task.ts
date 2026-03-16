export type Priority = "LOW" | "MED" | "HIGH";

export default interface Task {
    task_id: string;
    title: string;
    description: string;
    due_date: string;
    task_duration: number; // minutes
    priority: Priority;
    is_complete: boolean;
    calendar_event_id: string | null;
    scheduled_start: string | null;
    source_note_id: string;
}
