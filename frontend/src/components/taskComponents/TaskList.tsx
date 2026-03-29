import styled from "styled-components";
import type { Task } from "../../types/Task.ts";
import TaskEditable from "./TaskEditable.tsx";
import type { TaskSidebarProps } from "./TaskSidebarProps.ts";

// ── Styled Components ────────────────────────────────────────────────────────

const TaskContainer = styled.div`
  background-color: #cfcfcf;
  border-radius: 5px;
  max-width: 90%;
  margin: auto;
  padding-top: 0.5%;
  padding-bottom: 2%;
  min-height: 100vh;
`;

// ── Component ────────────────────────────────────────────────────────────────

export default function TaskList({
                                   tasks,
                                   selectedTaskIds,
                                   onToggleSelect,
                                   onUpdateTask,
                                   onSelectTask,
                                   onDeleteTask,
                                   onAddToSchedule,
                                   mode,
                                 }: TaskSidebarProps) {
  // Newest task first so the just-created task appears at the top


  return (
      <TaskContainer>
        {tasks.map((task: Task, index: number) => (
            <TaskEditable
                key={task.id}
                task={task}
                isEditable={mode === "planner"}
                initialEditing={index === 0 && !task.title} // auto-edit if brand new (no title yet)
                isSelected={selectedTaskIds?.includes(task.id!)}
                onClick={() =>
                    mode === "planner"
                        ? onToggleSelect?.(task.id!)
                        : onSelectTask?.(task)
                }
                onChange={onUpdateTask}
                onDelete={onDeleteTask}
                onAddToSchedule={onAddToSchedule}
            />
        ))}
      </TaskContainer>
  );
}