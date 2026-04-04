import {useState } from "react";
import TaskOpenModal from "../modal/TaskOpenModal.tsx"
import TimerTaskSelectionPage from "../../pages/TimerTaskSelectionPage.tsx"
import TimerScreen from "./TimerScreen.tsx";
import styled from "styled-components";
import BackButton from "../navigation/BackButton.tsx";
import { ROUTES } from "../../constants/Routes.ts";

const PageBackButton = styled(BackButton)`
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    z-index: 1100;
`;

export default function TimerEntryPage() {
    const [mode, setMode] = useState<"none" | "free" | "task">("none");

    if (mode === "free") return <TimerScreen />;
    if (mode === "task") return <TimerTaskSelectionPage />;

    return (
        <>
            <PageBackButton to={ROUTES.HOME}/>
            <TaskOpenModal
                onFree={() => setMode("free")}
                onTask={() => setMode("task")}
            />
        </>
    );
}