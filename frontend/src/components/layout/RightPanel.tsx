import ScheduleView from "../scheduleComponents/ScheduleView";

import type { RightPanelProps} from "./RightPanelProps.ts"

export default function RightPanel({mode, setMode, schedule, onCreateTask} : RightPanelProps) {
    return (
        <>
            {/* TOGGLE BUTTONS */}
            <div>
                <button onClick={() => setMode("manual")}>Manual</button>
                <button onClick={() => setMode("schedule")}>Schedule</button>
            </div>

            {/* CONTENT */}
            {mode === "manual" ? (
                <ManualEntry onCreateTask={onCreateTask} />
            ) : (
                <ScheduleView schedule={schedule} />
            )}
        </>
    );
}