import TaskSidebar from "../taskComponents/TaskSidebar.tsx";
import type {LeftPanelProps} from "./LeftPanelProps.ts";


export default function LeftPanel({setRightMode, onGenerateSchedule, tasks,
        selectedTaskIds, onToggleSelect, onUpdateTask} : LeftPanelProps) {
    return (
        <>
            {/* ACTION BUTTONS */}
            <button onClick={() => setRightMode("manual")}>
                + Add Task
            </button>

            <button onClick={onGenerateSchedule}>
                Generate Schedule
            </button>

            {/* TASK LIST */}
            <TaskSidebar
                tasks={tasks}
                mode="planner"
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={onToggleSelect}
                onUpdateTask={onUpdateTask}
            />
        </>
    );
}