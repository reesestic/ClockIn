export type Importance = 1 | 2 | 3 | 4 | 5;

export default interface Task {
    id: string;
    user_id: string;
    created_at: string;
    title: string;
    description: string | null;
    task_duration: number | null;
    priority: Importance | null;
    due_date: string | null;
    can_schedule: boolean | null;
    is_complete: boolean;
    // optional display-only field, not in Supabase
    scheduled_start?: string | null;
}
