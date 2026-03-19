import TaskEditable from "./TaskEditable";
import TaskViewOnly from "./TaskViewOnly";
import type { Task } from "../../types/Task";
import type {TaskSidebarProps} from "./TaskSidebarProps.ts";

export default function TaskSidebar({tasks, mode, selectedTaskIds,
             onToggleSelect, onUpdateTask, onSelectTask} : TaskSidebarProps) {
    return (
        <>
            {tasks.map((task : Task) =>
                mode === "planner" ? (
                    <TaskEditable
                        key={task.id}
                        task={task}
                        isSelected={selectedTaskIds?.includes(task.id!)}
                        onClick={() => onToggleSelect?.(task.id!)}
                        onChange={onUpdateTask}
                    />
                ) : (
                    <TaskViewOnly
                        key={task.id!}
                        task={task}
                        onClick={() => onSelectTask?.(task)}
                    />
                )
            )}
        </>
    );
}