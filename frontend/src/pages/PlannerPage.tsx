import { useEffect, useState } from "react";
import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import type {Task} from "../types/Task";
import TaskSidebar from "../components/taskComponents/TaskSidebar.tsx";
// import type {ScheduleBlock} from "../types/ScheduleBlock";
import {deleteTask, getTasks, saveTask, updateTask} from "../api/TaskApi.ts";

export default function PlannerPage() {
    const [tasks, setTasks] = useState<Task[]>([]);

    // ✅ multi-select
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

    // ✅ right panel mode
    //  const [rightMode, setRightMode] = useState<"manual" | "schedule">("schedule");

    // ✅ backend-generated schedule
    // const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);

    // ---------------------------
    // SELECTION
    // ---------------------------
    function toggleTaskSelection(taskId: string) {
        console.log(selectedTaskIds, "-> toggling", taskId);
        setSelectedTaskIds(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    }

    useEffect(() => {
        getTasks().then(fetchedTasks => setTasks(fetchedTasks));
    }, []);

    // ---------------------------
    // TASK CRUD
    // ---------------------------
    async function handleUpdateTask(updated: Task) {
        await updateTask(updated);
        setTasks(prev =>
            prev.map(t => (t.id === updated.id ? updated : t))
        );
    }

    async function handleCreateTask(newTask: Task) {
        const createdTask = await saveTask(newTask);
        console.log("Created task:", createdTask);
        setTasks(prev => [...prev, createdTask]);
    }

    async function handleDeleteTask(taskId: string) {
        const idDeleted = await deleteTask(taskId);
        setTasks(prev => prev.filter(task => task.id !== idDeleted));
    }
    // ---------------------------
    // 🔥 BACKEND SCHEDULING
    // ---------------------------
    // async function handleGenerateSchedule() {
    //     const res = await fetch("/api/schedule", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({ taskIds: selectedTaskIds }),
    //     });
    //
    //     const data = await res.json();
    //
    //     setSchedule(data);
    //     setRightMode("schedule");
    // }
    return (
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
                        console.log("Generate schedule for:", selectedTaskIds);
                    }}
                    onDeleteTask={handleDeleteTask}
                    onAddToSchedule={(taskId) => {
                        // stub
                        console.log("Add to schedule:", taskId);
                    }}
                />
            }
            right={<p>Hello World</p>}
        />
    );
}


