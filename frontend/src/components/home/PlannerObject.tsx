// PlannerObject.tsx
import styled from "styled-components";
import PlannerIcon from "../icons/PlannerIcon";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/Routes";

const Wrapper = styled.div`
    position: absolute;
    width: 20%;
    top: 60%;
    left: 60%;
    transform: scale(2.1);
    z-index: 8;
    cursor: pointer;

    & * {
        pointer-events: none;
    }

    &:hover::after {
        content: "Schedule"; /* or "Sticky Note Board" */
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        color: #4B94DB;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
        box-shadow: 0 0 8px rgba(255, 255, 255, 1),
        0 0 16px rgba(255, 255, 255, 0.9),
        0 0 32px rgba(255, 255, 255, 0.7),
        0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 1000;
    }
`;

const StyledPlanner = styled(PlannerIcon)`
    width: 100%;
    height: auto;
    display: block;
`;

const StyledLink = styled(Link)`
    position: absolute;
    inset: 0;
    cursor: pointer;
    z-index: 100;
    pointer-events: all;
`;

const DateOverlay = styled.div`
    position: absolute;
    top: 7%;
    right: 26%;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 2px;
    pointer-events: none;
    transform: perspective(200px) rotateY(-15deg) rotateX(5deg);
    transform-origin: right center;
    font-size: 2.5vw;
`;

const DayName = styled.span`
    font-size: 0.32em;
    font-weight: 500;
    color: #636363;
    font-style: italic;
    align-self: flex-end;
`;

const DayNumber = styled.span`
    font-size: 1em;
    font-weight: 400;
    color: #636363;
    line-height: 0.85;
    font-style: italic;
`;

const MonthName = styled.span`
    font-size: 0.32em;
    font-weight: 500;
    color: #636363;
    font-style: italic;
    padding: 1%;
    align-self: flex-end;
`;

export default function PlannerObject() {
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = today.getDate();
    const monthName = today.toLocaleDateString('en-US', { month: 'short' });

    return (
        <Wrapper data-tutorial="planner">
            <StyledPlanner />
            <DateOverlay>
                <DayName>{dayName}</DayName>
                <DayNumber>{dayNumber}</DayNumber>
                <MonthName>{monthName}</MonthName>
            </DateOverlay>
            <StyledLink to={ROUTES.PLANNER} />
        </Wrapper>
    );
}
