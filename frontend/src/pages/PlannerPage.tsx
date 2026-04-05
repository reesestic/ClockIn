import { useState, useEffect } from "react";
import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import ScheduleView from "../components/scheduleComponents/ScheduleView.tsx";
import TaskSidebar from "../components/taskComponents/TaskSidebar.tsx";

import type {Task} from "../types/Task";
import type {Schedule} from "../types/Schedule";

import { getTasks, saveTask, deleteTask } from "../api/taskApi.ts";
import { generateSchedule, getSchedule } from "../api/scheduleApi";
import { ROUTES } from "../constants/Routes.ts";
import BackButton from "../components/navigation/BackButton.tsx";

export default function PlannerPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

    const [schedule, setSchedule] = useState<Schedule | null>(null);

    useEffect(() => {
        getTasks().then(setTasks);

        getSchedule()
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

    async function handleCreateTask(newTask: Omit<Task, "id" | "can_schedule">): Promise<void> {
        const createdTask = await saveTask(newTask);
        setTasks(prev => [createdTask, ...prev]);// prepend so it appears at top
        return createdTask;
    }

    async function handleDeleteTask(taskId: string) {
        await deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    }

    async function handleGenerate(filters?: any) {
        const newSchedule = await generateSchedule(selectedTaskIds, filters);

        setSchedule(newSchedule);
    }

    return (
        <>
            <TwoColumnLayout
                left={
                    <>
                        <BackButton to={ROUTES.HOME} style={{ color: "#000000" }} />
                        <TaskSidebar
                            props={{
                                tasks,
                                mode: "planner",
                                selectedTaskIds,
                                onToggleSelect: toggleTaskSelection,
                                onUpdateTask: handleUpdateTask,
                            }}
                            onAddTask={handleCreateTask}
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
                    />
                }
            />

        </>
    );
}