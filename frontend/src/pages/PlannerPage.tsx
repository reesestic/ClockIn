import { useEffect, useState } from "react";
import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import type {Task} from "../types/Task";
import TaskSidebar from "../components/taskComponents/TaskSidebar.tsx";
// import type {ScheduleBlock} from "../types/ScheduleBlock";
import {getTasks} from "../api/TaskApi.ts";

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
        setSelectedTaskIds(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    }

    useEffect(() => {
        getTasks().then(fetchedTasks => setTasks(fetchedTasks));
    }, [tasks]);

    // ---------------------------
    // TASK CRUD
    // ---------------------------
    function handleUpdateTask(updated: Task) {
        setTasks(prev =>
            prev.map(t => (t.id === updated.id ? updated : t))
        );
    }

    function handleCreateTask(newTask: Task) {
        setTasks(prev => [...prev, newTask]);
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
                        handleCreateTask({ ...newTask, can_schedule: false });
                    }}
                    onGenerateSchedule={() => {
                        // TODO: wire to handleGenerateSchedule when backend is ready
                        console.log("Generate schedule for:", selectedTaskIds);
                    }}
                    onDeleteTask={(taskId) => {
                        // TODO: DELETE to FastAPI
                        setTasks(prev => prev.filter(t => t.id !== taskId));
                    }}
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


