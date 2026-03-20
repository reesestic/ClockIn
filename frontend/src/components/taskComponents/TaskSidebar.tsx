import { useState } from "react";
import styled from "styled-components";
import TaskList from "./TaskList";
import ManualEntryPanel from "./ManualEntryPanel";
import type { TaskSidebarProps } from "./TaskSidebarProps.ts";
import type { Task } from "../../types/Task.ts";

// ── Styled Components ────────────────────────────────────────────────────────

const SidebarContainer = styled.div`
  position: relative; /* anchor for the panel overlay */
  width: 50%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
`;

const Heading = styled.h4`
  margin: 0;
`;

const AddButton = styled.button`
  background: none;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 2px 10px;
  &:hover {
    background-color: #f5f5f5;
  }
`;

const ScrollableTaskList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
`;

const Footer = styled.div`
  padding: 12px 16px;
  border-top: 1px solid #eee;
`;

const GenerateButton = styled.button`
  width: 100%;
  padding: 10px;
  background-color: #333;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  &:hover {
    background-color: #555;
  }
`;

// ── Component ────────────────────────────────────────────────────────────────

type TaskSidebarFullProps = {
    props: TaskSidebarProps;
    onAddTask: (task: Omit<Task, "id" | "can_schedule">) => Promise<void>;
    onGenerateSchedule: () => void;
    onDeleteTask?: (taskId: string) => void;
    onAddToSchedule?: (taskId: string) => void;
};

export default function TaskSidebar(
    {props, onAddTask, onGenerateSchedule, onDeleteTask, onAddToSchedule}: TaskSidebarFullProps)
{
    // Panel is always mounted (state preserved), isOpen controls visibility
    const [panelOpen, setPanelOpen] = useState(false);

    return (
        <SidebarContainer>
            {/* ── Header ── */}
            <Header>
                <Heading>Tasks</Heading>
                {props.mode === "planner" && (
                    <AddButton
                        onClick={() => setPanelOpen((prev) => !prev)}
                        title="Add task"
                    >
                        +
                    </AddButton>
                )}
            </Header>

            {/* ── Task List ── */}
            <ScrollableTaskList>
                <TaskList
                    tasks={props.tasks ?? []}
                    selectedTaskIds={props.selectedTaskIds}
                    onToggleSelect={props.onToggleSelect}
                    onUpdateTask={props.onUpdateTask}
                    onSelectTask={props.onSelectTask}
                    onDeleteTask={onDeleteTask}
                    onAddToSchedule={onAddToSchedule}
                    mode={props.mode}
                />
            </ScrollableTaskList>

            {/* ── Footer: Generate Schedule ── */}
            {props.mode === "planner" && (
                <Footer>
                    <GenerateButton onClick={onGenerateSchedule}>
                        Create Schedule!
                    </GenerateButton>
                </Footer>
            )}

            {/* ── ManualEntryPanel overlay — always mounted so form state persists ── */}
            {props.mode === "planner" && (
                <ManualEntryPanel
                    isOpen={panelOpen}
                    onMinimize={() => setPanelOpen((prev) => !prev)}
                    onCreateTask={async (task : Task) => {
                        await onAddTask(task);
                        // Panel stays open after create (form was reset inside panel)
                    }}
                />
            )}
        </SidebarContainer>
    );
}