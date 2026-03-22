import { useState, useEffect } from "react";
import styled from "styled-components";

import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import ScheduleView from "../components/scheduleComponents/ScheduleView.tsx";
import TaskSidebar from "../components/taskComponents/TaskSidebar.tsx";
import type {ScheduleFilters} from "../types/ScheduleFilters.ts";
import { BackButton } from "../components/navigation/BackButton";

const PageBackButton = styled(BackButton)`
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    z-index: 10;
`

import type {Task} from "../types/Task";
import type {Schedule} from "../types/Schedule";

import { getTasks, saveTask, deleteTask } from "../api/taskApi.ts";
import { generateSchedule, getActiveSchedule } from "../api/scheduleApi.ts";
import {ROUTES} from "../constants/Routes.ts";

export default function PlannerPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

    const [schedule, setSchedule] = useState<Schedule | null>(null);

    const [filters, setFilters] = useState<ScheduleFilters>({
        deadline: "none",
        importance: "none",
        value: "none",
        time: "none",
        subject: "none",
    });

    useEffect(() => {
        getTasks().then(setTasks);

        getActiveSchedule()
            .then(setSchedule)
            .catch(() => setSchedule(null));
    }, []);

    // ---------------------------
    // SELECTION
    // ---------------------------
    function toggleTaskSelection(taskId: string) {
        setSelectedTaskIds(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    }

    // ---------------------------
    // TASK CRUD
    // ---------------------------
    function handleUpdateTask(updated: Task) {
        setTasks(prev =>
            prev.map(t => (t.id === updated.id ? updated : t))
        );
    }

    async function handleCreateTask(newTask: Task) {
        const createdTask = await saveTask(newTask);
        setTasks(prev => [...prev, createdTask]);
    }

    async function handleDeleteTask(taskId: string) {
        await deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    }

    async function handleGenerate() {
        const newSchedule = await generateSchedule(selectedTaskIds, filters);
        setSchedule(newSchedule);
        // close filters menu?
    }

    return (
        <>
            <TwoColumnLayout
                left={
                    <>
                        <PageBackButton to={ROUTES.HOME} label="Home"/>
                        <TaskSidebar
                            props={{
                                tasks,
                                mode: "planner",
                                selectedTaskIds,
                                onToggleSelect: toggleTaskSelection,
                                onUpdateTask: handleUpdateTask,
                            }}
                            onAddTask={async (newTask) => {
                                // TODO: POST to FastAPI, then add returned task (with id) to state
                                await handleCreateTask({ ...newTask, can_schedule: false });
                            }}
                            onDeleteTask={handleDeleteTask}
                            onAddToSchedule={(taskId) => {
                                // stub
                                console.log("Add to schedule:", taskId);
                            }}
                        />
                    </>
                }
                right={
                    <ScheduleView
                        schedule={schedule}
                        onGenerate={handleGenerate}
                        filters={filters}
                        setFilters={setFilters}
                    />
                }
            />
        </>
    );
}
