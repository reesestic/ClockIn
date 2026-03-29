import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import TaskList from "../components/taskComponents/TaskList";
import ScheduleView from "../components/scheduleComponents/ScheduleView";
import TaskActionModal from "../components/modal/TaskActionModal";
import type { Task } from "../types/Task";
import type { Schedule } from "../types/Schedule";
import type { ScheduleBlock } from "../types/ScheduleBlock";


import { getTasks } from "../api/taskApi";
import { getSchedule } from "../api/scheduleApi";
import styled from "styled-components";

const TimerSidebarContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

const TimerHeader = styled.div`
  padding: 12px 16px;
`;

const TimerTitle = styled.h4`
  margin: 0;
`;

const TimerScrollableList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
`;

export default function TimerTaskSelectionPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [activeItem, setActiveItem] = useState<Task | ScheduleBlock | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        getTasks().then(setTasks);

        getSchedule().then((data) => setSchedule(data))
            .catch(() => setSchedule(null));
    }, []);

    const timeableTasks: Task[] = tasks;

    return (
        <>
            <TwoColumnLayout
                left={
                    <TimerSidebarContainer>
                        <TimerHeader>
                            <TimerTitle>Pick a Task</TimerTitle>
                        </TimerHeader>

                        <TimerScrollableList>
                            <TaskList
                                tasks={timeableTasks}
                                mode="timer"
                                onSelectTask={setActiveItem}
                            />
                        </TimerScrollableList>
                    </TimerSidebarContainer>
                }
                right={
                    <ScheduleView
                        schedule={schedule}
                        onBlockClick={setActiveItem}
                    />
                }
            />

            {activeItem && (
                <TaskActionModal
                    item={activeItem}
                    onClose={() => setActiveItem(null)}

                    onStart={(item) => {
                        console.log("START TASK MODE:", item);

                        navigate("/timer", {
                            state: {
                                mode: "task",
                                item: item,
                                hasPlan: false,
                            },
                        });
                    }}

                    onAutomate={(item) => {
                        console.log("START ATOMIZED MODE:", item);

                        navigate("/timer", {
                            state: {
                                mode: "task",
                                item: item,
                                hasPlan: true,
                            },
                        });
                    }}
                />
            )}
        </>
    );
}