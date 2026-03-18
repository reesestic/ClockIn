export function TaskSidebar({editable, onChangeView}: {
    editable: boolean; onChangeView?: (mode: "manual" | "schedule") => void; }) {
    return (
        <div>
            <h3>Tasks</h3>

            {/* Tasks done by Kevin */}

            {editable && (
                <>
                    <button onClick={() => onChangeView?.("manual")}>
                        Add Task
                    </button>

                    <button onClick={() => onChangeView?.("schedule")}>
                        Generate Schedule
                    </button>
                </>
            )}
        </div>
    );
}