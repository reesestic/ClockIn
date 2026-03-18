import { useState } from "react";
import TwoColumnLayout from "../components/layout/TwoColumnLayout";
import {TaskSidebar} from "../components/taskComponents/TaskSidebar";

export function TimerPage() {
    return (
        <TwoColumnLayout
            left={
                <TaskSidebar editable={false} />
            }
            right={
                <RightPanel
                    viewMode="schedule"
                    interactionMode="read"
                />
            }
        />
    );
}