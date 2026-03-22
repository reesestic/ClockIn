import { useState, useEffect } from "react";
import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import ScheduleView from "../components/scheduleComponents/ScheduleView.tsx";
import TaskSidebar from "../components/taskComponents/TaskSidebar.tsx";
import ScheduleFilterModal from "../components/modal/ScheduleFilterModal.tsx";

import type {Task} from "../types/Task";
import type {Schedule} from "../types/Schedule";

import { getTasks, saveTask, deleteTask } from "../api/taskApi.ts";
import { generateSchedule } from "../api/scheduleApi.ts";

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

    async function handleCreateTask(newTask: Task) {
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