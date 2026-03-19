import type {Task} from "../../types/Task.ts";
import TaskViewOnly from "./TaskViewOnly.tsx";
import TaskEditable from "./TaskEditable.ts";

export default function TaskList({ tasks, editable, selectedTaskIds, onTaskSelect }: {
    tasks: Task[];
    editable: boolean;
    selectedTaskIds?: Set<string>;
    onTaskSelect?: (taskId: string) => void;
}) {
    return (
        <>
            {tasks.map(task => (
                editable
                    ? <TaskEditable
                        key={task.id}
                        task={task}
                        selected={selectedTaskIds?.has(task.id)}
                        onSelect={onTaskSelect}
                    />
                    : <TaskViewOnly
                        key={task.id}
                        task={task}
                        onSelect={onTaskSelect}  // just fires, no selected highlight
                    />
            ))}
        </>
    );
}