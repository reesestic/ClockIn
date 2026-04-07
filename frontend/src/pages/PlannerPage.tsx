import { useState, useEffect } from "react";
import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import ScheduleView from "../components/scheduleComponents/ScheduleView.tsx";
import TaskSidebar from "../components/taskComponents/TaskSidebar.tsx";
import ScheduleFilterModal from "../components/modal/ScheduleFilterModal.tsx";
import { useAuth } from "../context/AuthContext";

import type { Task } from "../types/Task";
import type { Schedule } from "../types/Schedule";
import type { ScheduleBlock } from "../types/ScheduleBlock";

import { getTasks, createTask, deleteTask, updateTask } from "../api/TaskApi";

export default function PlannerPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
    const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);

    useEffect(() => {
        getTasks().then(setTasks).catch(console.error);
    }, []);

    function toggleTaskSelection(taskId: string) {
        setSelectedTaskIds((prev) =>
            prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
        );
    }

    function handleUpdateTask(updated: Task) {
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        if (updated.id) {
            updateTask(updated.id, updated).catch(console.error);
        }
    }

    async function handleCreateTask(task: Omit<Task, "id" | "can_schedule">) {
        const newTask = await createTask(task);
        setTasks((prev) => [...prev, newTask]);
    }

    async function handleDeleteTask(taskId: string) {
        await deleteTask(taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setSelectedTaskIds((prev) => prev.filter((id) => id !== taskId));
    }

    function handleConfirm(schedule: Schedule) {
        setActiveSchedule(schedule);
        setScheduleBlocks(schedule.blocks);
        setShowFilters(false);
        setTasks((prev) => prev.filter((t) => !selectedTaskIds.includes(t.id!)));
        setSelectedTaskIds([]);
    }

    function handleBlocksChange(blocks: ScheduleBlock[]) {
        setScheduleBlocks(blocks);
        if (activeSchedule) {
            setActiveSchedule({ ...activeSchedule, blocks });
        }
    }

    const displaySchedule = activeSchedule
        ? { ...activeSchedule, blocks: scheduleBlocks }
        : undefined;

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
                        onAddTask={handleCreateTask}
                        onGenerateSchedule={() => setShowFilters(true)}
                        onDeleteTask={handleDeleteTask}
                        onAddToSchedule={(taskId) => {
                            if (!selectedTaskIds.includes(taskId)) {
                                setSelectedTaskIds((prev) => [...prev, taskId]);
                            }
                        }}
                    />
                }
                right={
                    <ScheduleView
                        schedule={displaySchedule}
                        onEdit={() => setShowFilters(true)}
                        onBlocksChange={handleBlocksChange}
                    />
                }
            />

            {showFilters && user && (
                <ScheduleFilterModal
                    onClose={() => setShowFilters(false)}
                    onConfirm={handleConfirm}
                    selectedTasks={tasks.filter((t) => selectedTaskIds.includes(t.id!))}
                    userId={user.id}
                />
            )}
        </>
    );
}
