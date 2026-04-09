import { useState, useEffect } from "react";
import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import ScheduleView from "../components/scheduleComponents/ScheduleView.tsx";
import TaskSidebar from "../components/taskComponents/TaskSidebar.tsx";
import ScheduleFilterModal from "../components/modal/ScheduleFilterModal.tsx";
import { useAuth } from "../context/AuthContext";

import type { Task } from "../types/Task";
import type { Schedule } from "../types/Schedule";
import type { ScheduleBlock } from "../types/ScheduleBlock";

import { getTasks, saveTask, deleteTask, updateTask } from "../api/taskApi";
import { rejectBlock, getSchedule } from "../api/scheduleApi";
import { ROUTES } from "../constants/Routes.ts";
import BackButton from "../components/navigation/BackButton.tsx";

export default function PlannerPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [schedule, setSchedule] = useState<Schedule | null>(null);

    useEffect(() => {
        getTasks().then(setTasks).catch(console.error);
        getSchedule().then(setSchedule).catch(() => setSchedule(null));
    }, []);

    function toggleTaskSelection(taskId: string) {
        setSelectedTaskIds(prev =>
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
    }

    function handleUpdateTask(updated: Task) {
        setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
        if (updated.id) {
            updateTask(updated).catch(console.error);
        }
    }

    async function handleCreateTask(newTask: Omit<Task, "id" | "can_schedule">): Promise<void> {
        const created = await saveTask(newTask);
        setTasks(prev => [created, ...prev]);
    }

    async function handleDeleteTask(taskId: string) {
        await deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    }

    function handleConfirm(confirmed: Schedule) {
        setSchedule(confirmed);
        setShowFilters(false);
        setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id!)));
        setSelectedTaskIds([]);
    }

    function handleBlocksChange(newBlocks: ScheduleBlock[]) {
        if (!schedule || !user) return;

        const movedBlock = newBlocks.find(nb => {
            const old = schedule.blocks.find(b => b.id === nb.id);
            return old && (old.start !== nb.start || old.date !== nb.date);
        });

        if (movedBlock) {
            const old = schedule.blocks.find(b => b.id === movedBlock.id)!;
            rejectBlock(movedBlock.task_id!, `${old.date}T${old.start}:00`, user.id).catch(console.error);
        }

        setSchedule({ ...schedule, blocks: newBlocks });
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
                                if (!selectedTaskIds.includes(taskId)) {
                                    setSelectedTaskIds(prev => [...prev, taskId]);
                                }
                            }}
                        />
                    </>
                }
                right={
                    <ScheduleView
                        schedule={schedule}
                        onGenerate={() => setShowFilters(true)}
                        onBlocksChange={handleBlocksChange}
                    />
                }
            />

            {showFilters && user && (
                <ScheduleFilterModal
                    onClose={() => setShowFilters(false)}
                    onConfirm={handleConfirm}
                    selectedTasks={tasks.filter(t => selectedTaskIds.includes(t.id!))}
                    userId={user.id}
                />
            )}
        </>
    );
}
