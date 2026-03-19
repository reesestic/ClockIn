/*import { useState } from "react";*/
import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import TaskSidebar from "../components/taskComponents/TaskSidebar";
import ScheduleView from "../components/scheduleComponents/ScheduleView";
import TaskActionModal from "../components/modal/TaskActionModal";

import type { Task } from "../types/Task";
import type { ScheduleBlock } from "../types/ScheduleBlock";

export function TimerPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);
    const [activeItem, setActiveItem] = useState<Task | ScheduleBlock | null>(null);

    return (
        <>
            <TwoColumnLayout
                left={
                    <TaskSidebar
                        tasks={tasks}
                        mode="timer"
                        onSelectTask={setActiveItem}
                    />
                }
                right={
                    <ScheduleView
                        schedule={schedule}
                        onClickBlock={setActiveItem}
                    />
                }
            />

            {activeItem && (
                <TaskActionModal
                    item={activeItem}
                    onClose={() => setActiveItem(null)}
                />
            )}
        </>
    );
}