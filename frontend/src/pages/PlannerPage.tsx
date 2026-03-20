import { useState, useEffect } from "react";
import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import ScheduleView from "../components/scheduleComponents/ScheduleView.tsx";
import TaskSidebar from "../components/taskComponents/TaskSidebar.tsx";
import ScheduleFilterModal from "../components/modal/ScheduleFilterModal.tsx";

import type {Task} from "../types/Task";
import type {Schedule} from "../types/Schedule";

import { getTasks, createTask, deleteTask } from "../api/TaskApi";
import { generateSchedule } from "../api/ScheduleApi";

export default function PlannerPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    const [schedules, setSchedules] = useState<Schedule[]>([]);

    // render the active one (dont have a thing to swap the IDs yet
    const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);

    const activeSchedule = schedules.find(
        s => s.id === activeScheduleId
    );

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

    async function handleCreateTask(task: Task) {
        const newTask = await createTask(task);
        setTasks(prev => [...prev, newTask]);
    }

    async function handleDeleteTask(taskId: string) {
        await deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    }

    // ---------------------------
    // 🔥 BACKEND SCHEDULING
    // ---------------------------
    async function handleGenerate(filters?: any) {
        const data = await generateSchedule(selectedTaskIds, filters);
        setSchedules(data);
    }

    return (
        <>
            <TwoColumnLayout
                left={
                    <TaskSidebar
                        tasks={tasks}
                        mode="planner"
                        selectedTaskIds={selectedTaskIds}
                        onToggleSelect={toggleTaskSelection}
                        onUpdateTask={handleUpdateTask}
                        onCreate={handleCreateTask}
                        onDelete={handleDeleteTask}
                        onGenerate={() => setShowFilters(true)}
                    />
                }
                right={
                    <ScheduleView schedule={activeSchedule} />}
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