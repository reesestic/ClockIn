import { useState, useEffect } from "react";
import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import ScheduleView from "../components/scheduleComponents/ScheduleView.tsx";
import TaskSidebar from "../components/taskComponents/TaskSidebar.tsx";
import ScheduleFilterModal from "../components/modal/ScheduleFilterModal.tsx";

import type {Task} from "../types/Task";
import type {Schedule} from "../types/Schedule";

import { getTasks, saveTask, deleteTask } from "../api/taskApi";
import { generateSchedule } from "../api/ScheduleApi";
import { ROUTES } from "../constants/Routes.ts";
import styled from "styled-components";
import { BackButton } from "../components/navigation/BackButton.tsx";


const PageBackButton = styled(BackButton)`
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    z-index: 10;
`;



export default function PlannerPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    const [schedule, setSchedule] = useState<Schedule | null>(null);

    useEffect(() => {
        getTasks().then(setTasks);
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

    async function handleCreateTask(newTask: Omit<Task, "id" | "can_schedule">) {
        const createdTask = await saveTask(newTask);
        setTasks(prev => [...prev, createdTask]);
    }

    async function handleDeleteTask(taskId: string) {
        await deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    }

    async function handleGenerate(filters?: any) {
        const newSchedule = await generateSchedule(selectedTaskIds, filters);

        setSchedule(newSchedule);
        setShowFilters(false);
    }

    return (
        <>
            <TwoColumnLayout
                left={
                    <>
                        <PageBackButton to={ROUTES.HOME} label="Home" />
                        <TaskSidebar
                            props={{
                                tasks,
                                mode: "planner",
                                selectedTaskIds,
                                onToggleSelect: toggleTaskSelection,
                                onUpdateTask: handleUpdateTask,
                            }}
                            onAddTask={handleCreateTask}
                            onGenerateSchedule={() => {
                                // TODO: wire to handleGenerateSchedule when backend is ready
                                // console.log("Generate schedule for:", selectedTaskIds);
                                setShowFilters(true);
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
                    <ScheduleView schedule={schedule} />}
            />

            {showFilters && (
                <ScheduleFilterModal
                    onClose={() => setShowFilters(false)}
                    onGenerate={handleGenerate}
                />
            )}
        </>
    );
}