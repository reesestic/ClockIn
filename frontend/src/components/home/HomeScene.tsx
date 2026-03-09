import PotObject from "./PotObject";
import PlannerObject from "./PlannerObject";
import ClockObject from "./ClockObject";
import StickyNotesOnDeskObject from "./StickyNotesOnDeskObject";
import HomepageBlankObject from "./HomepageBlankObject";
import styled from "styled-components";

export const SceneWrapper = styled.div`
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
`;

export default function HomeScene() {
    return (
        <SceneWrapper>

            <HomepageBlankObject />

            <PotObject />
            <PlannerObject />
            <ClockObject />
            <StickyNotesOnDeskObject />

        </SceneWrapper>
    );
}