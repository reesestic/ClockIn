import type { Task } from "../../types/Task.ts";

export type TaskSidebarProps = {
    tasks: Task[];
    mode: "planner" | "timer";
    selectedTaskIds?: string[];
    onToggleSelect?: (taskId: string) => void;
    onUpdateTask?: (task: Task) => void;
    onSelectTask?: (task: Task) => void;
    onDeleteTask?: (taskId: string) => void;
    onAddToSchedule?: (taskId: string) => void;
};