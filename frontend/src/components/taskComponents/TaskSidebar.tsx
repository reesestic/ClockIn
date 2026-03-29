import styled from "styled-components";
import TaskList from "./TaskList";
import type { TaskSidebarProps } from "./TaskSidebarProps.ts";
import type { Task } from "../../types/Task.ts";


// ── Styled Components ────────────────────────────────────────────────────────

const SidebarContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 12px 16px;
`;

const Heading = styled.h4`
  margin-left: 20%;
  font-size: calc(2px + 3.5vh);
  font-family: "clother", sans-serif;
  font-weight: 700;
  font-style: italic;
`;

const SubHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-left: 20%;
  margin-right: 4%;
`;

const SubHeader = styled.h4`
  font-size: calc(2px + 1vh);
  font-family: "clother", sans-serif;
  font-weight: 400;
  font-style: italic;
  color: #aaaaaa;
  margin: 0;
`;

const AddButton = styled.button`
  background: none;
  border: 1px solid #ccc;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  font-size: 1rem;
  cursor: pointer;
  color: #636363;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
  &:hover {
    background-color: #f5f5f5;
    color: black;
    border-color: #999;
  }
`;

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
  onDeleteTask?: (taskId: string) => void;
  onAddToSchedule?: (taskId: string) => void;
};

export default function TaskSidebar({
                                      props,
                                      onAddTask,
                                      onDeleteTask,
                                      onAddToSchedule,
                                    }: TaskSidebarFullProps) {


  const handleAdd = async () => {
    await onAddTask({
      title: "",
      description: "",
      due_date: null,
      task_duration: 0,
      importance: 0,
      difficulty: 0,
      status: "to do",
    });
    // returned task lands in props.tasks via parent state,
    // TaskList renders it at the top with initialEditing=true
  };

  return (
      <SidebarContainer>
        {/* ── Header ── */}
        <Header>
          <Heading>Tasks</Heading>
          <SubHeaderRow>
            <SubHeader>things you need to get done...</SubHeader>
            {props.mode === "planner" && (
                <AddButton onClick={handleAdd} title="Add task">
                  +
                </AddButton>
            )}
          </SubHeaderRow>
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
      </SidebarContainer>
  );
}