import type { Task } from "../../types/Task.ts";
import TaskViewOnly from "./TaskViewOnly.tsx";
import TaskEditable from "./TaskEditable.tsx";
import type { TaskSidebarProps } from "./TaskSidebarProps.ts";
import styled from 'styled-components';


const TaskContainer = styled.div`
    background-color: #CFCFCF;
    border-radius: 5px;
    max-width: 90%;
    margin: auto;
    padding-top: 0.5%;
    padding-bottom: 2%;
    min-height: 100vh;
`


export default function TaskList(props: TaskSidebarProps) {
  return (
    <TaskContainer>
      {props.tasks.map((task: Task) =>
        props.mode === "planner" ? (
          <TaskEditable
            key={task.id}
            task={task}
            isSelected={props.selectedTaskIds?.includes(task.id!)}
            onClick={() => props.onToggleSelect?.(task.id!)}
            onChange={props.onUpdateTask}
            onDelete={props.onDeleteTask}
            onAddToSchedule={props.onAddToSchedule}
          />
        ) : (
          <TaskViewOnly
            key={task.id!}
            task={task}
            onClick={() => props.onSelectTask?.(task)}
          />
        )
      )}
    </TaskContainer>
  );
}
