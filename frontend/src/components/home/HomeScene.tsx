import { useState } from "react";
import PotObject from "./PotObject";
import PlannerObject from "./PlannerObject";
import ClockObject from "./ClockObject";
import StickyNotesOnDeskObject from "./StickyNotesOnDeskObject";
import HomepageBlankObject from "./HomepageBlankObject";
import ProfileSidebar from "./ProfileSidebar";
import HomeIcon from "../icons/HomeIcon.tsx";
import styled from "styled-components";
import TaskBookObject from "./TaskBookObject.tsx";

export const SceneWrapper = styled.div`
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
`;

const HomeBtn = styled.button<{ $open: boolean }>`
    position: fixed;
    top: 16px;
    left: ${p => p.$open ? `${350 + 8}px` : "16px"};
    z-index: 200;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
`;

export default function HomeScene() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <SceneWrapper>
            {/* Sidebar overlays the scene — nothing else moves */}
            <ProfileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <HomepageBlankObject />
            <PotObject />
            <PlannerObject />
            <ClockObject />
            <StickyNotesOnDeskObject />
            <TaskBookObject />



            <HomeBtn $open={sidebarOpen} onClick={() => setSidebarOpen(prev => !prev)}>
                <HomeIcon className="w-[53px] h-[53px]" />
            </HomeBtn>
        </SceneWrapper>
    );
}