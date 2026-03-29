import { useState } from "react";
import styled from "styled-components";
import TaskList from "./TaskList";
import ManualEntryPanel from "./ManualEntryPanel";
import type { TaskSidebarProps } from "./TaskSidebarProps.ts";
import type { Task } from "../../types/Task.ts";


// ── Styled Components ────────────────────────────────────────────────────────

const SidebarContainer = styled.div`
  position: relative; /* anchor for the panel overlay */
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
`;

const Heading = styled.h4`
  margin-left: 20%;
    font-size: calc(2px + 3.5vh);
    font-family: "clother", sans-serif;
    font-weight: 700;
    font-style: italic;

`;

const SubHeader = styled.h4`
    margin-left: 20%;
    font-size: calc(2px + 1vh);
    font-family: "clother", sans-serif;
    font-weight: 400;
    font-style: italic;
    color: #aaaaaa;
`

// const AddButton = styled.button`
//   background: none;
//   border: 1px solid #ccc;
//   border-radius: 4px;
//   font-size: 1.1rem;
//   cursor: pointer;
//   padding: 2px 10px;
//   &:hover {
//     background-color: #f5f5f5;
//   }
// `;

const ScrollableTaskList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
  width: 100%;
`;


// ── Component ────────────────────────────────────────────────────────────────

type TaskSidebarFullProps = {
  props: TaskSidebarProps;
  onAddTask: (task: Omit<Task, "id" | "can_schedule">) => Promise<void>;
  onGenerateSchedule: () => void;
  onDeleteTask?: (taskId: string) => void;
  onAddToSchedule?: (taskId: string) => void;
};

export default function TaskSidebar({
  props,
  onAddTask,
  onDeleteTask,
  onAddToSchedule,
}: TaskSidebarFullProps) {
  // Panel is always mounted (state preserved), isOpen controls visibility
  const [panelOpen, setPanelOpen] = useState(false);
  return (
    <SidebarContainer>
      {/* ── Header ── */}
      <Header>
        <Heading>Tasks</Heading>
        {/*{props.mode === "planner" && (*/}
        {/*  <AddButton*/}
        {/*    onClick={() => setPanelOpen((prev) => !prev)}*/}
        {/*    title="Add task"*/}
        {/*  >*/}
        {/*    +*/}
        {/*  </AddButton>*/}
        {/*)}*/}
          <SubHeader>things you need to get done...</SubHeader>
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

      {/* ── ManualEntryPanel overlay — always mounted so form state persists ── */}
      {props.mode === "planner" && (
        <ManualEntryPanel
          isOpen={panelOpen}
          onMinimize={() => setPanelOpen((prev) => !prev)}
          onCreateTask={async (task) => {
            await onAddTask(task);
            // Panel stays open after create (form was reset inside panel)
          }}
        />
      )}
    </SidebarContainer>
  );
}
