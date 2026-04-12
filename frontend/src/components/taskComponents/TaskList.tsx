import styled from "styled-components";
import type { Task } from "../../types/Task.ts";
import TaskEditable from "./TaskEditable.tsx";
import TaskSelectable from "./TaskSelectable.tsx";
import type { TaskSidebarProps } from "./TaskSidebarProps.ts";
import { useState } from "react";

// ── Styled Components ────────────────────────────────────────────────────────

const TaskContainer = styled.div`
    background-color: #ffffff;
    border-radius: 5px;
    max-width: 90%;
    margin: auto;
    padding-bottom: 2%;
    min-height: 100vh;
`;

const StickyBar = styled.div`
    position: sticky;
    top: 0;
    z-index: 20;
    background-color: #ffffff;
    padding: 10px 12px 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 5px 5px 0 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
`;

const SearchInput = styled.input`
    flex: 1;
    padding: 4px 10px;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    font-size: calc(2px + 1vh);
    font-family: "clother", sans-serif;
    font-style: italic;
    color: #636363;
    outline: none;
    box-sizing: border-box;
    background: #fff;
    &:focus {
        border-color: #aaa;
    }
    &::placeholder {
        color: #ccc;
    }
`;

const SortSelect = styled.select`
    padding: 4px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    font-size: calc(2px + 1vh);
    font-family: "clother", sans-serif;
    font-style: italic;
    color: #636363;
    background: #fff;
    outline: none;
    cursor: pointer;
    &:focus {
        border-color: #aaa;
    }
`;

const AddButton = styled.button`
    background: #f5f5f5;
    border: 1px solid #999;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    font-size: 1rem;
    cursor: pointer;
    color: black;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
    &:hover {
        background-color: #e0e0e0;
        border-color: #777;
        color: #333;
    }
`;

// ── Types ────────────────────────────────────────────────────────────────────

type SortKey = "none" | "due_date" | "difficulty" | "importance" | "task_duration";

type TaskListProps = TaskSidebarProps & {
    onAddTask?: () => void;
    hideControls?: boolean;   // add this

};

// ── Component ────────────────────────────────────────────────────────────────

export default function TaskList({
                                     tasks,
                                     selectedTaskIds,
                                     onToggleSelect,
                                     onUpdateTask,
                                     onSelectTask,
                                     onDeleteTask,
                                     onAddToSchedule,
                                     onAddTask,
                                     mode,
                                     onSplitTask,
                                     hideControls = false,
                                 }: TaskListProps) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("none");

    const filteredTasks = (tasks ?? []).filter(task =>
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase())
    );

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (sortKey === "none") return 0;
        if (sortKey === "due_date") {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return a.due_date.localeCompare(b.due_date);
        }
        return (b[sortKey] ?? 0) - (a[sortKey] ?? 0); // higher = first for importance/difficulty/duration
    });

    return (
        <TaskContainer>
            {!hideControls && (        // wrap StickyBar
                <StickyBar>
                    {mode === "tasklist" && onAddTask && (
                        <AddButton onClick={onAddTask} title="Add task">+</AddButton>
                    )}
                    <SearchInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="search tasks..."
                    />
                    <SortSelect
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as SortKey)}
                    >
                        <option value="none">sort by...</option>
                        <option value="due_date">due date</option>
                        <option value="importance">importance</option>
                        <option value="difficulty">difficulty</option>
                        <option value="task_duration">duration</option>
                    </SortSelect>
                </StickyBar>
            )}

            {sortedTasks.map((task: Task, index: number) => {
                if (mode === "planner") {
                    return (
                        <TaskSelectable
                            key={task.id}
                            task={task}
                            isSelected={selectedTaskIds?.includes(task.id!)}
                            onClick={() => onToggleSelect?.(task.id!)}
                        />
                    );
                }

                return (
                    <TaskEditable
                        key={task.id}
                        task={task}
                        isEditable={mode === "tasklist"}
                        initialEditing={index === 0 && !task.title}
                        isSelected={false}
                        onClick={() => onSelectTask?.(task)}
                        onChange={onUpdateTask}
                        onDelete={onDeleteTask}
                        onAddToSchedule={onAddToSchedule}
                        onSplit={onSplitTask}
                    />
                );
            })}
        </TaskContainer>
    );
}