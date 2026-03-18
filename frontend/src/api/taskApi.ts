import { supabase } from "../database/supabaseClient";
import type Task from "../interfaces/task";

export async function getTasksForUser(userId: string): Promise<Task[]> {
    const { data, error } = await supabase
        .from("Tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data as Task[];
}

export async function markTaskComplete(taskId: string): Promise<Task> {
    const { data, error } = await supabase
        .from("Tasks")
        .update({ is_complete: true })
        .eq("id", taskId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data as Task;
}
