import type {ScheduleBlock} from "../../types/ScheduleBlock.ts";
import type {Task} from "../../types/Task.ts";

type RightMode = "manual" | "schedule";

export type RightPanelProps = {
    // 🧠 controls which panel is shown
    mode: RightMode;
    setMode: (mode: RightMode) => void;

    // 📦 backend-generated schedule
    schedule: ScheduleBlock[];

    // ✍️ manual entry
    onCreateTask: (task: Task) => void;
};