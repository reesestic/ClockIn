import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PotObject from "./PotObject";
import PlannerObject from "./PlannerObject";
import ClockObject from "./ClockObject";
import StickyNotesOnDeskObject from "./StickyNotesOnDeskObject";
import HomepageBlankObject from "./HomepageBlankObject";
import ProfileSidebar from "./ProfileSidebar";
import HomeIcon from "../icons/HomeIcon.tsx";
import styled from "styled-components";
import TaskBookObject from "./TaskBookObject.tsx";
import TutorialButton from "../onboardingComponents/TutorialButton.tsx";
import { HOME_TUTORIAL_STEPS } from "../../constants/HomeTutorialSteps.ts";

export const SceneWrapper = styled.div`
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
`;

const HomeBtn = styled.button<{ $open: boolean }>`
    position: fixed;
    top: 16px;
    left: ${p => (p.$open ? `${350 + 8}px` : "16px")};
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

/* 🌱 NEW: Garden entry (placeholder plant) */
const GardenEntry = styled.div`
    position: absolute;
    top: 12%;
    right: 16%;
    transform: translate(-50%, -50%);
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: radial-gradient(circle, #6FCF97, #27AE60);
    box-shadow: 0 8px 20px rgba(0,0,0,0.25);
    opacity: 0.7;
    cursor: pointer;
    z-index: 150;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
        transform: translate(-50%, -50%) scale(1.08);
        box-shadow: 0 12px 28px rgba(0,0,0,0.35);
    }
`;

export default function HomeScene() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <SceneWrapper>
            {/* Sidebar */}
            <ProfileSidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Background + objects */}
            <HomepageBlankObject />
            <PotObject />
            <PlannerObject />
            <ClockObject />
            <StickyNotesOnDeskObject />
            <TaskBookObject />

            {/* 🌱 NEW: Clickable Garden Entry */}
            <GardenEntry
                onClick={() => navigate("/garden")}
                title="Go to Garden"
            />

            {/* Home button */}
            <HomeBtn
                data-tutorial="home-btn"
                $open={sidebarOpen}
                onClick={() => setSidebarOpen(prev => !prev)}
            >
                <HomeIcon className="w-[53px] h-[53px]" />
            </HomeBtn>

            {/* Tutorial */}
            <TutorialButton steps={HOME_TUTORIAL_STEPS} />
        </SceneWrapper>
    );
}