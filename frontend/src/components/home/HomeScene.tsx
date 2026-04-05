import { useState } from "react";
import PotObject from "./PotObject";
import PlannerObject from "./PlannerObject";
import ClockObject from "./ClockObject";
import StickyNotesOnDeskObject from "./StickyNotesOnDeskObject";
import HomepageBlankObject from "./HomepageBlankObject";
import ProfileSidebar from "./ProfileSidebar";
import HomeIcon from "../icons/HomeIcon.tsx";
import styled from "styled-components";

export const SceneWrapper = styled.div`
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
`;

const HomeBtn = styled.button`
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 10;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
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

            {/* Only show the home button when sidebar is closed */}
            {!sidebarOpen && (
                <HomeBtn onClick={() => setSidebarOpen(true)}>
                    <HomeIcon />
                </HomeBtn>
            )}
        </SceneWrapper>
    );
}