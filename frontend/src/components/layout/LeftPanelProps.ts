import type {Task} from "../../types/Task.ts";

export type LeftPanelProps = {
    // 🔁 controls RIGHT SIDE
    setRightMode: (mode: "manual" | "schedule") => void;

    // ⚡ triggers backend scheduling
    onGenerateSchedule: () => void;

    // 📦 data
    tasks: Task[];

    // ✅ multi-select
    selectedTaskIds: string[];

    // 🎯 selection logic
    onToggleSelect: (taskId: string) => void;

    // ✏️ editing (planner only)
    onUpdateTask: (task: Task) => void;
};