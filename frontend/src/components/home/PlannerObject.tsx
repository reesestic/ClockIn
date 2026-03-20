import styled from "styled-components";
import PlannerIcon from "../icons/PlannerIcon";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/Routes";

const StyledPlanner = styled(PlannerIcon)`
    position: absolute;
    width: 17%;
    top: 60%;
    left: 55%;
    cursor: pointer;
`;

const StyledLink = styled(Link)`
    display: contents;
`;

export default function PlannerObject() {
    return (
        <StyledLink to={ROUTES.PLANNER}>
            <StyledPlanner />
        </StyledLink>
    );
}