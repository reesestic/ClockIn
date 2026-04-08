import styled from "styled-components";
import PlannerIcon from "../icons/PlannerIcon";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/Routes";

const Wrapper = styled.div`
    position: absolute;
    width: 20%;
    top: 60%;
    left: 60%;
    transform:scale(2.1);
    z-index: 8;
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
`;

export default function PlannerObject() {
    return (
        <Wrapper>
            <StyledPlanner />
            <StyledLink to={ROUTES.PLANNER} />
        </Wrapper>
    );
}