import TaskList from "./TaskList";
import type { Task } from "../../types/Task.ts";

export function TaskSidebar({ editable, tasklist, selectedTaskIds, onTaskSelect, onAddTask, onGenerateSchedule }: {
    editable: boolean;
    tasklist?: Task[];
    selectedTaskIds?: Set<string>;
    onTaskSelect?: (taskId: string) => void;
    onAddTask?: () => void;
    onGenerateSchedule?: () => void;
}) {
    return (
        <>
            <TaskList
                tasks={tasklist ?? []}
                editable={editable}
                selectedTaskIds={selectedTaskIds}
                onTaskSelect={onTaskSelect}
            />

            {editable && (
                <>
                    <button onClick={onAddTask}>Add Task</button>
                    <button onClick={onGenerateSchedule}>Generate Schedule</button>
                </>
            )}
        </>
    );
}