import { useState } from "react";
import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import {TaskSidebar} from "../components/taskComponents/TaskSidebar";

export function PlannerPage() {
    const [viewMode, setViewMode] = useState<"manual" | "schedule">("manual");

    return (
        <TwoColumnLayout
            left={
                <TaskSidebar
                    editable={true}
                    onChangeView={setViewMode}
                />
            }
            right={
                <RightPanel
                    viewMode={viewMode}
                    interactionMode="edit"
                />
            }
        />
    );
}