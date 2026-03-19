import { useEffect, useState } from "react";
import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import RightPanel from "../components/layout/RightPanel.tsx";
import LeftPanel from "../components/layout/LeftPanel.tsx";
import type {Task} from "../types/Task";
import type {ScheduleBlock} from "../types/ScheduleBlock";


export default function PlannerPage() {
    const [tasks, setTasks] = useState<Task[]>([]);

    // ✅ multi-select
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

    // ✅ right panel mode
    const [rightMode, setRightMode] = useState<"manual" | "schedule">("schedule");

    // ✅ backend-generated schedule
    const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);

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

    function handleCreateTask(newTask: Task) {
        setTasks(prev => [...prev, newTask]);
    }

    // ---------------------------
    // 🔥 BACKEND SCHEDULING
    // ---------------------------
    async function handleGenerateSchedule() {
        const res = await fetch("/api/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskIds: selectedTaskIds }),
        });

        const data = await res.json();

        setSchedule(data);
        setRightMode("schedule");
    }

    return (
        <TwoColumnLayout
            left={
                <LeftPanel
                    setRightMode={setRightMode}
                    onGenerateSchedule={handleGenerateSchedule}
                    tasks={tasks}
                    selectedTaskIds={selectedTaskIds}
                    onToggleSelect={toggleTaskSelection}
                    onUpdateTask={handleUpdateTask}
                />
            }
            right={
                <RightPanel
                    mode={rightMode}
                    setMode={setRightMode}
                    schedule={schedule}
                    onCreateTask={handleCreateTask}
                />
            }
        />
    );
}


