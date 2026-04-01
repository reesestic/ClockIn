import styled from "styled-components";
import type { Task } from "../../types/Task.ts";
import TaskEditable from "./TaskEditable.tsx";
import type { TaskSidebarProps } from "./TaskSidebarProps.ts";
import {useState} from "react";

// ── Styled Components ────────────────────────────────────────────────────────

const SearchInput = styled.input`
  margin-left: 7%;
  margin-right: 4%;
  margin-top: 10px;
  width: 85%;
  padding: 4px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: calc(2px + 1vh);
  font-family: "clother", sans-serif;
  font-style: italic;
  color: #636363;
  outline: none;
  box-sizing: border-box;
  &:focus {
    border-color: #aaa;
  }
  &::placeholder {
    color: #ccc;
  }
`;

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

    const [search, setSearch] = useState("");
    const filteredTasks = (tasks ?? []).filter(task =>
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase())
    );

  return (
      <TaskContainer>
          <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search tasks..."
          />
        {filteredTasks.map((task: Task, index: number) => (
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